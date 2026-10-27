export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num) {
  if (num == null || isNaN(num)) return '—';
  return new Intl.NumberFormat('vi-VN').format(num);
}

