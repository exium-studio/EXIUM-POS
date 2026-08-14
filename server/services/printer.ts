export interface ThermalReceiptData {
  branch_name: string;
  branch_address: string;
  branch_phone: string;
  transaction_number: string;
  order_number: string;
  table_number?: string;
  order_type: string;
  date_time: string;
  cashier_name: string;
  customer_name: string;
  items: {
    name: string;
    variant?: string;
    qty: number;
    price: number;
    subtotal: number;
    notes?: string;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  service_charge: number;
  total: number;
  payment_method: string;
  paid_amount: number;
  change_amount: number;
  paper_width_mm: 58 | 80;
}

export function formatThermalReceiptText(data: ThermalReceiptData): string {
  const width = data.paper_width_mm === 80 ? 48 : 32;
  const line = '='.repeat(width);
  const dashed = '-'.repeat(width);

  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const justify = (left: string, right: string) => {
    const space = width - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right;
  };

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

  const lines: string[] = [
    center(data.branch_name.toUpperCase()),
    center(data.branch_address),
    center(`Telp: ${data.branch_phone}`),
    line,
    justify(`No: ${data.transaction_number}`, data.date_time.split(' ')[0]),
    justify(`Kasir: ${data.cashier_name}`, data.date_time.split(' ')[1] || ''),
    justify(`Pelanggan: ${data.customer_name}`, data.table_number ? `Meja: ${data.table_number}` : `Tipe: ${data.order_type}`),
    dashed,
  ];

  for (const item of data.items) {
    const itemTitle = item.variant ? `${item.name} (${item.variant})` : item.name;
    lines.push(itemTitle);
    lines.push(justify(`  ${item.qty}x @${formatIDR(item.price)}`, formatIDR(item.subtotal)));
    if (item.notes) {
      lines.push(`  * ${item.notes}`);
    }
  }

  lines.push(dashed);
  lines.push(justify('Subtotal:', formatIDR(data.subtotal)));
  if (data.discount > 0) {
    lines.push(justify('Diskon:', `-${formatIDR(data.discount)}`));
  }
  if (data.service_charge > 0) {
    lines.push(justify('Service Charge:', formatIDR(data.service_charge)));
  }
  if (data.tax > 0) {
    lines.push(justify('PPN (11%):', formatIDR(data.tax)));
  }
  lines.push(line);
  lines.push(justify('TOTAL AKHIR:', formatIDR(data.total)));
  lines.push(justify(`Bayar (${data.payment_method.toUpperCase()}):`, formatIDR(data.paid_amount)));
  if (data.change_amount > 0) {
    lines.push(justify('Kembalian:', formatIDR(data.change_amount)));
  }
  lines.push(line);
  lines.push(center('Terima Kasih Atas Kunjungan Anda'));
  lines.push(center('Instagram: @kopinusantara.id'));
  lines.push(center('Simpan struk ini sebagai bukti transaksi'));

  return lines.join('\n');
}

export function formatKitchenTicketText(order: any, station: 'food' | 'beverage' | 'all'): string {
  const width = 32;
  const line = '='.repeat(width);
  const dashed = '-'.repeat(width);

  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const justify = (left: string, right: string) => {
    const space = width - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right;
  };

  const stationLabel = station === 'food' ? 'DAPUR MAKANAN' : station === 'beverage' ? 'BAR MINUMAN' : 'ORDER DAPUR';

  const lines: string[] = [
    line,
    center(`*** TIKET ${stationLabel} ***`),
    center(`Order: ${order.order_number}`),
    justify(`Meja: ${order.table_number || 'Take Away'}`, new Date().toLocaleTimeString('id-ID')),
    justify(`Cust: ${order.customer_name}`, `Tipe: ${order.order_type}`),
    dashed,
  ];

  const filteredItems = order.items.filter((i: any) => {
    if (station === 'all') return true;
    return i.kitchen_station === station;
  });

  for (const item of filteredItems) {
    const name = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;
    lines.push(`[ ] ${item.quantity}x ${name}`);
    if (item.modifiers && item.modifiers.length > 0) {
      lines.push(`    + ${item.modifiers.map((m: any) => m.name).join(', ')}`);
    }
    if (item.notes) {
      lines.push(`    NOTE: ${item.notes}`);
    }
  }

  lines.push(line);
  return lines.join('\n');
}

export function formatPreBillThermalText(data: Omit<ThermalReceiptData, 'paid_amount' | 'change_amount' | 'payment_method'>): string {
  const width = data.paper_width_mm === 80 ? 48 : 32;
  const line = '='.repeat(width);
  const dashed = '-'.repeat(width);

  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const justify = (left: string, right: string) => {
    const space = width - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right;
  };

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

  const lines: string[] = [
    center(data.branch_name.toUpperCase()),
    center(data.branch_address),
    center(`Telp: ${data.branch_phone}`),
    line,
    center('*** TAGIHAN SEMENTARA (PRE-BILL) ***'),
    center('(BELUM LUNAS / OPEN BILL)'),
    line,
    justify(`Order: ${data.order_number}`, data.date_time.split(' ')[0] || ''),
    justify(`Kasir/Staf: ${data.cashier_name}`, data.date_time.split(' ')[1] || ''),
    justify(`Pelanggan: ${data.customer_name}`, data.table_number ? `Meja: ${data.table_number}` : `Tipe: ${data.order_type}`),
    dashed,
  ];

  for (const item of data.items) {
    const itemTitle = item.variant ? `${item.name} (${item.variant})` : item.name;
    lines.push(itemTitle);
    lines.push(justify(`  ${item.qty}x @${formatIDR(item.price)}`, formatIDR(item.subtotal)));
    if (item.notes) {
      lines.push(`  * ${item.notes}`);
    }
  }

  lines.push(dashed);
  lines.push(justify('Subtotal:', formatIDR(data.subtotal)));
  if (data.discount > 0) {
    lines.push(justify('Diskon:', `-${formatIDR(data.discount)}`));
  }
  if (data.service_charge > 0) {
    lines.push(justify('Service Charge:', formatIDR(data.service_charge)));
  }
  if (data.tax > 0) {
    lines.push(justify('PPN (11%):', formatIDR(data.tax)));
  }
  lines.push(line);
  lines.push(justify('TOTAL TAGIHAN:', formatIDR(data.total)));
  lines.push(line);
  lines.push(center('Silakan bawa tagihan ini ke kasir'));
  lines.push(center('atau bayar langsung kepada staf pelayan'));
  lines.push(center('Terima Kasih'));

  return lines.join('\n');
}
