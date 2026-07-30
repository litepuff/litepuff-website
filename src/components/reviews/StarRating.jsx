export default function StarRating({ value = 0, onChange, label = 'Rating', size = 'text-lg' }) {
  return <div className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`${label}: ${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => onChange
      ? <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={`${star} stars`} onClick={() => onChange(star)} className={`min-h-0 p-0.5 ${size} ${star <= value ? 'text-[#C89B3C]' : 'text-[#D8D2C7]'}`}>★</button>
      : <span key={star} aria-hidden="true" className={`${size} ${star <= Math.round(value) ? 'text-[#C89B3C]' : 'text-[#D8D2C7]'}`}>★</span>)}
  </div>;
}
