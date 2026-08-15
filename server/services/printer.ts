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
  // Custom receipt configurations
  receipt_header_name?: string;
  receipt_header_tagline?: string;
  receipt_footer_text?: string;
  receipt_show_social?: boolean;
  receipt_social_handle?: string;
  receipt_tax_label?: string;
  receipt_service_label?: string;
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

  const headerName = data.receipt_header_name || data.branch_name;
  const headerTagline = data.receipt_header_tagline || data.branch_address;
  const taxLabel = data.receipt_tax_label || 'PPN (11%)';
  const serviceLabel = data.receipt_service_label || 'Service Charge';

  const lines: string[] = [
    center(headerName.toUpperCase()),
  ];

  if (headerTagline) {
    // split tagline by newline if it has any, and center each line
    headerTagline.split('\n').forEach(tLine => {
      lines.push(center(tLine));
    });
  }

  if (data.branch_phone) {
    lines.push(center(`Telp: ${data.branch_phone}`));
  }

  lines.push(line);
  lines.push(justify(`No: ${data.transaction_number}`, data.date_time.split(' ')[0]));
  lines.push(justify(`Kasir: ${data.cashier_name}`, data.date_time.split(' ')[1] || ''));
  lines.push(justify(`Pelanggan: ${data.customer_name}`, data.table_number ? `Meja: ${data.table_number}` : `Tipe: ${data.order_type}`));
  lines.push(dashed);

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
    lines.push(justify(`${serviceLabel}:`, formatIDR(data.service_charge)));
  }
  if (data.tax > 0) {
    lines.push(justify(`${taxLabel}:`, formatIDR(data.tax)));
  }
  lines.push(line);
  lines.push(justify('TOTAL AKHIR:', formatIDR(data.total)));
  lines.push(justify(`Bayar (${data.payment_method.toUpperCase()}):`, formatIDR(data.paid_amount)));
  if (data.change_amount > 0) {
    lines.push(justify('Kembalian:', formatIDR(data.change_amount)));
  }
  lines.push(line);

  // Custom footer
  if (data.receipt_footer_text) {
    data.receipt_footer_text.split('\n').forEach(fLine => {
      lines.push(center(fLine));
    });
  } else {
    lines.push(center('Terima Kasih Atas Kunjungan Anda'));
    lines.push(center('Simpan struk ini sebagai bukti transaksi'));
  }

  if (data.receipt_show_social !== false && data.receipt_social_handle) {
    lines.push(center(`Sosmed: ${data.receipt_social_handle}`));
  }

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
