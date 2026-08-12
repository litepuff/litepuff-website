import { formatMoney } from '../utils/formatMoney.js';

export default function ProductPriceDisplay({
  price,
  mrp,
  className = '',
  priceClassName = 'text-lg',
}) {
  const sellingPrice = Number(price || 0);
  const regularPrice = Number(mrp || sellingPrice);
  const discountPercent = regularPrice > sellingPrice
    ? Math.round(((regularPrice - sellingPrice) / regularPrice) * 100)
    : 0;

  return (
    <div className={className} aria-label={`Price ${formatMoney(sellingPrice)}${discountPercent ? `, MRP ${formatMoney(regularPrice)}, ${discountPercent}% off` : ''}`}>
      {discountPercent > 0 && (
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#7A817C]">
            MRP <span className="line-through">{formatMoney(regularPrice)}</span>
          </span>
          <span className="rounded-full bg-[#E5EFE8] px-2 py-0.5 font-bold text-[#1E4D3A]">
            {discountPercent}% OFF
          </span>
        </div>
      )}
      <strong className={`block font-display font-semibold text-[#1F5E3B] ${priceClassName}`}>
        {formatMoney(sellingPrice)}
      </strong>
    </div>
  );
}
