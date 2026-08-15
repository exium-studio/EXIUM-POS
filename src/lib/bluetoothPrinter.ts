// Web Bluetooth ESC/POS Printer Helper

export interface BluetoothDeviceConfig {
  name: string;
  id: string;
}

// Typical UUIDs used by Web Bluetooth printers
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Bluetooth GATT Printer Service
  '00001101-0000-1000-8000-00805f9b34fb', // SPP (Serial Port Profile) - common on cheap thermal printers
  '0000ff00-0000-1000-8000-00805f9b34fb', // Custom manufacturer UUIDs
  '49535343-fe7d-4158-b78c-1a664853138b',
];

const PRINTER_CHARACTERISTIC_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb', // Standard Printer Write characteristic
  '00004953-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
];

let activeDevice: any = null;
let activeCharacteristic: any = null;

export const bluetoothPrinter = {
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  },

  async connect(): Promise<BluetoothDeviceConfig> {
    if (!this.isSupported()) {
      throw new Error('Browser Anda tidak mendukung Web Bluetooth. Gunakan Google Chrome atau Microsoft Edge.');
    }

    try {
      // Prompt user to select device
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: PRINTER_SERVICE_UUIDS },
          { namePrefix: 'PT-' },
          { namePrefix: 'Printer' },
          { namePrefix: 'RPP' },
          { namePrefix: 'MTP' },
          { namePrefix: 'MP' },
          { namePrefix: 'EP' },
        ],
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Gagal menghubungkan ke GATT server printer.');
      }

      // Find the primary service and characteristic
      let service: any;
      for (const uuid of PRINTER_SERVICE_UUIDS) {
        try {
          service = await server.getPrimaryService(uuid);
          if (service) break;
        } catch (e) {
          // Keep searching
        }
      }

      if (!service) {
        // Fallback: try getting all services
        const services = await server.getPrimaryServices();
        if (services.length > 0) {
          service = services[0];
        } else {
          throw new Error('Service printer Bluetooth tidak ditemukan.');
        }
      }

      let characteristic: any;
      for (const charUuid of PRINTER_CHARACTERISTIC_UUIDS) {
        try {
          characteristic = await service.getCharacteristic(charUuid);
          if (characteristic) break;
        } catch (e) {
          // Keep searching
        }
      }

      if (!characteristic) {
        const characteristics = await service.getCharacteristics();
        // find a characteristic that supports write/writeWithoutResponse
        characteristic = characteristics.find(
          (c: any) => c.properties.write || c.properties.writeWithoutResponse
        );
      }

      if (!characteristic) {
        throw new Error('Karakteristik penulisan data printer tidak ditemukan.');
      }

      activeDevice = device;
      activeCharacteristic = characteristic;

      const deviceConfig: BluetoothDeviceConfig = {
        name: device.name || 'Printer Bluetooth',
        id: device.id,
      };

      localStorage.setItem('paired_bluetooth_printer', JSON.stringify(deviceConfig));

      // Setup disconnection listener
      device.addEventListener('gattserverdisconnected', () => {
        activeDevice = null;
        activeCharacteristic = null;
        localStorage.removeItem('paired_bluetooth_printer_connected');
        // Dispatch custom event to notify listeners
        window.dispatchEvent(new Event('bluetooth_printer_status_changed'));
      });

      localStorage.setItem('paired_bluetooth_printer_connected', 'true');
      window.dispatchEvent(new Event('bluetooth_printer_status_changed'));
      return deviceConfig;
    } catch (error: any) {
      console.error('Bluetooth connection failed:', error);
      throw error;
    }
  },

  async disconnect(): Promise<void> {
    if (activeDevice && activeDevice.gatt?.connected) {
      activeDevice.gatt.disconnect();
    }
    activeDevice = null;
    activeCharacteristic = null;
    localStorage.removeItem('paired_bluetooth_printer_connected');
    window.dispatchEvent(new Event('bluetooth_printer_status_changed'));
  },

  isConnected(): boolean {
    return !!activeDevice && !!activeDevice.gatt?.connected;
  },

  getPairedDevice(): BluetoothDeviceConfig | null {
    const data = localStorage.getItem('paired_bluetooth_printer');
    return data ? JSON.parse(data) : null;
  },

  async print(text: string): Promise<void> {
    if (!this.isConnected() || !activeCharacteristic) {
      // Try to auto-reconnect if device info is saved
      const paired = this.getPairedDevice();
      if (paired) {
        throw new Error('Printer Bluetooth terputus. Silakan hubungkan kembali dari menu pengaturan.');
      } else {
        throw new Error('Belum ada printer Bluetooth terhubung.');
      }
    }

    try {
      // ESC/POS Initialization command
      const initCommand = new Uint8Array([0x1b, 0x40]);
      await activeCharacteristic.writeValue(initCommand);

      // Encode text into bytes (using CP437 or basic latin/windows-1252)
      const encoder = new TextEncoder();
      const textBytes = encoder.encode(text + '\n\n\n'); // Add margins/feed lines

      // Write in chunks to prevent GATT buffer overflow (max 20 bytes for BLE standard MTU)
      const maxChunkSize = 20;
      for (let i = 0; i < textBytes.length; i += maxChunkSize) {
        const chunk = textBytes.slice(i, i + maxChunkSize);
        await activeCharacteristic.writeValue(chunk);
      }

      // Cut paper command (optional, some printers do it automatically)
      const cutCommand = new Uint8Array([0x1d, 0x56, 0x41, 0x03]);
      await activeCharacteristic.writeValue(cutCommand).catch(() => {});
    } catch (error: any) {
      console.error('Printing failed:', error);
      throw new Error('Gagal mencetak: ' + error.message);
    }
  }
};
