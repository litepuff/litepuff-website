import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiFlag, FiSearch, FiThumbsUp, FiUpload, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { reviewService } from '../../services/reviewService';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useToast } from '../../context/ToastContext';
import StarRating from './StarRating';

const attributes = [['tasteRating', 'Taste'], ['freshnessRating', 'Freshness'], ['packagingRating', 'Packaging'], ['valueRating', 'Value for Money'], ['crunchinessRating', 'Crunchiness']];
const emptyForm = { rating: 0, title: '', review: '', tasteRating: 0, freshnessRating: 0, packagingRating: 0, valueRating: 0, crunchinessRating: 0 };
const filters = [['all', 'All'], ['photos', 'Photos'], ['videos', 'Videos'], ['verified', 'Verified Purchase'], ['5', '5★'], ['4', '4★'], ['3', '3★'], ['2', '2★'], ['1', '1★']];
const sorts = [['helpful', 'Most Helpful'], ['newest', 'Newest'], ['oldest', 'Oldest'], ['highest', 'Highest Rating'], ['lowest', 'Lowest Rating']];

function WriteReview({ open, close, submit, busy }) {
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  function onSubmit(event) {
    event.preventDefault();
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    images.forEach((file) => payload.append('images', file));
    if (video) payload.append('video', video);
    submit(payload);
  }
  return <AnimatePresence>{open && <motion.div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#14251D]/55 backdrop-blur-sm sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <motion.form onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="write-review-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-8" initial={{ y: 30 }} animate={{ y: 0 }}>
      <div className="flex items-center justify-between"><h2 id="write-review-title" className="font-display text-3xl font-semibold">Share your experience</h2><button type="button" onClick={close} aria-label="Close review form" className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#F3EFE6]"><FiX /></button></div>
      <div className="mt-6"><p className="mb-1 text-sm font-semibold">Overall rating</p><StarRating value={form.rating} onChange={(value) => set('rating', value)} size="text-3xl" /></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{attributes.map(([key, label]) => <div key={key}><p className="text-sm font-semibold">{label}</p><StarRating value={form[key]} onChange={(value) => set(key, value)} label={label} /></div>)}</div>
      <label className="mt-5 block text-sm font-semibold">Review title<input required maxLength="120" value={form.title} onChange={(event) => set('title', event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#DCD4C7] px-4 font-normal" /></label>
      <label className="mt-4 block text-sm font-semibold">Your review<textarea required minLength="10" maxLength="3000" value={form.review} onChange={(event) => set('review', event.target.value)} className="mt-2 min-h-32 w-full resize-y rounded-xl border border-[#DCD4C7] p-4 font-normal" /></label>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#BEB6A8] p-4 text-sm"><FiUpload />{images.length ? `${images.length} image(s)` : 'Up to 5 images'}<input className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={(event) => setImages([...event.target.files].slice(0, 5))} /></label>
        <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#BEB6A8] p-4 text-sm"><FiUpload />{video ? video.name : 'One MP4 (max 60 sec)'}<input className="sr-only" type="file" accept="video/mp4" onChange={(event) => setVideo(event.target.files[0] || null)} /></label>
      </div>
      <button disabled={busy || !form.rating || attributes.some(([key]) => !form[key])} className="mt-6 h-12 w-full rounded-full bg-[#1E4D3A] text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Submitting…' : 'Submit Review'}</button>
    </motion.form>
  </motion.div>}</AnimatePresence>;
}

function ReviewCard({ item, product, own, helpful, report, edit, remove }) {
  const [media, setMedia] = useState(null);
  return <article className="rounded-[22px] border border-[#ECE7DD] bg-white p-5 shadow-[0_10px_30px_rgba(36,48,41,.04)] sm:p-7">
    <div className="flex items-start gap-3">{item.customerPhoto ? <img src={item.customerPhoto} alt="" loading="lazy" className="h-11 w-11 rounded-full object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-[#E8F0EA] font-semibold text-[#1E4D3A]">{item.customerName?.[0] || 'L'}</span>}<div><div className="flex flex-wrap items-center gap-2"><h3 className="font-sans text-sm font-bold">{item.customerName}</h3>{item.verifiedPurchase && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E4D3A]"><FiCheckCircle /> Verified Purchase</span>}</div><p className="mt-1 text-xs text-[#747B76]">India · {new Date(item.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p></div></div>
    <div className="mt-4 flex items-center gap-2"><StarRating value={item.rating} /><span className="text-xs font-bold">{item.rating}.0</span>{item.featured && <span className="rounded-full bg-[#F7EBCF] px-2 py-1 text-[10px] font-bold text-[#79591D]">FEATURED</span>}</div>
    <h4 className="mt-2 font-sans text-base font-bold">{item.title}</h4><p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#515954]">{item.review}</p><p className="mt-3 text-xs text-[#747B76]">Flavor: <b>{product.flavour}</b> · Size: <b>{product.weight || 'Standard pack'}</b></p>
    {!!item.images?.length && <div className="mt-4 flex gap-2 overflow-x-auto">{item.images.map((image, index) => <button key={image.url} type="button" onClick={() => setMedia({ image, index })} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border"><img src={image.thumbnail || image.url} alt={`Customer review ${index + 1}`} loading="lazy" className="h-full w-full object-cover" /></button>)}</div>}
    {item.video && <button type="button" onClick={() => setMedia({ video: item.video })} className="mt-4 block w-full max-w-sm overflow-hidden rounded-xl bg-black"><video src={item.video} preload="metadata" className="aspect-video w-full" /></button>}
    {item.reply && <div className="mt-5 rounded-2xl border-l-4 border-[#1E4D3A] bg-[#F3F7F4] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#1E4D3A]">Official LitePuff Reply</p><p className="mt-2 text-sm leading-6">{item.reply.reply}</p></div>}
    <div className="mt-5 flex flex-wrap gap-2 border-t border-[#EEE9DF] pt-4"><button onClick={() => helpful(item)} className="inline-flex items-center gap-2 rounded-full border px-4 text-xs font-semibold"><FiThumbsUp /> Helpful ({item.helpfulCount})</button><button onClick={() => report(item)} className="inline-flex items-center gap-2 px-3 text-xs text-[#68706B]"><FiFlag /> Report</button>{own && <><button onClick={() => edit(item)} className="ml-auto px-3 text-xs font-semibold text-[#1E4D3A]">Edit</button><button onClick={() => remove(item)} className="px-3 text-xs font-semibold text-[#9A392F]">Delete</button></>}</div>
    {media && <div className="fixed inset-0 z-[130] grid place-items-center bg-black/90 p-4" role="dialog" aria-modal="true" onClick={() => setMedia(null)}><button className="absolute right-5 top-5 text-2xl text-white" aria-label="Close media"><FiX /></button>{media.video ? <video src={media.video} controls autoPlay className="max-h-[85vh] max-w-full" onClick={(event) => event.stopPropagation()} /> : <img src={media.image.url} alt="Customer review" className="max-h-[85vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />}</div>}
  </article>;
}

export default function ProductReviews({ product, onSummary }) {
  const { customer } = useCustomerAuth();
  const { showToast, confirmAction, promptAction } = useToast();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ averageRating: 0, count: 0, distribution: [], attributes: {} });
  const [reviews, setReviews] = useState([]);
  const [query, setQuery] = useState({ page: 1, filter: 'all', sort: 'helpful', search: '' });
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const errorText = (error) => error.response?.data?.message || error.response?.data?.error || 'Something went wrong.';
  const load = useCallback(async () => { setLoading(true); try { const result = await reviewService.list(product.id, query); setReviews((current) => query.page > 1 ? [...current, ...result.reviews] : result.reviews); setPagination(result.pagination); } catch { showToast('Reviews could not be loaded.', 'error'); } finally { setLoading(false); } }, [product.id, query, showToast]);
  const loadSummary = useCallback(async () => { const result = await reviewService.summary(product.id); setSummary(result); onSummary?.(result); }, [product.id, onSummary]);
  useEffect(() => { load(); }, [load]); useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) { load(); loadSummary(); } };
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [load, loadSummary]);
  const change = (next) => setQuery((current) => ({ ...current, page: 1, ...next }));
  const signedIn = () => { if (customer) return true; showToast('Please sign in to continue.', 'info'); navigate('/login'); return false; };
  return <section id="product-reviews" aria-labelledby="reviews-title">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#C89B3C]">Tried and loved</p><h2 id="reviews-title" className="mt-2 font-display text-[36px] font-semibold sm:text-[46px]">Customer Reviews</h2></div><button onClick={() => signedIn() && setModal(true)} className="h-12 rounded-full bg-[#1E4D3A] px-6 text-sm font-semibold text-white">Write Review</button></div>
    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.25fr]"><div className="rounded-[24px] border bg-white p-6"><div className="flex items-end gap-3"><span className="font-display text-6xl font-semibold">{Number(summary.averageRating).toFixed(1)}</span><div className="pb-1"><StarRating value={summary.averageRating} /><p className="text-xs text-[#747B76]">Based on {summary.count} Reviews</p></div></div><div className="mt-5 space-y-2">{summary.distribution.map((row) => <div key={row.rating} className="grid grid-cols-[42px_1fr_30px] items-center gap-2 text-xs"><span>{row.rating} ★</span><div className="h-2 overflow-hidden rounded-full bg-[#EEE9DF]"><motion.div initial={{ width: 0 }} whileInView={{ width: `${summary.count ? row.count / summary.count * 100 : 0}%` }} className="h-full bg-[#C89B3C]" /></div><span>{row.count}</span></div>)}</div></div><div className="rounded-[24px] border bg-white p-6"><h3 className="font-sans text-sm font-bold">Rating Summary</h3><div className="mt-5 grid gap-4 sm:grid-cols-2">{Object.entries(summary.attributes).map(([name, value]) => <div key={name} className="flex justify-between border-b pb-3 text-sm"><span className="capitalize">{name === 'value' ? 'Value for Money' : name}</span><b>{Number(value).toFixed(1)} ★</b></div>)}</div></div></div>
    <div className="mt-7 flex gap-2 overflow-x-auto pb-2">{filters.map(([value, label]) => <button key={value} onClick={() => change({ filter: value })} className={`shrink-0 rounded-full border px-4 text-xs font-semibold ${query.filter === value ? 'bg-[#1E4D3A] text-white' : 'bg-white'}`}>{label}</button>)}</div>
    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="relative"><FiSearch className="absolute left-4 top-1/2 -translate-y-1/2" /><input value={query.search} onChange={(event) => change({ search: event.target.value })} placeholder="Search inside reviews" className="h-12 w-full rounded-full border bg-white pl-11 pr-4 text-sm" /></label><select value={query.sort} onChange={(event) => change({ sort: event.target.value })} className="h-12 rounded-full border bg-white px-4 text-sm">{sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="mt-6 space-y-4">{loading && !reviews.length ? [...Array(3)].map((_, index) => <div key={index} className="h-56 animate-pulse rounded-[22px] bg-white" />) : reviews.map((item) => <ReviewCard key={item.id} item={item} product={product} own={item.customerId === customer?.id} helpful={async () => { if (!signedIn()) return; try { const result = await reviewService.helpful(item.id); setReviews((rows) => rows.map((row) => row.id === item.id ? { ...row, helpfulCount: result.helpfulCount } : row)); } catch (error) { showToast(errorText(error), 'error'); } }} report={async () => { if (!signedIn()) return; const reason = await promptAction({ title: 'Report review', message: 'Enter: Spam, Abuse, Fake Review, or Wrong Product', placeholder: 'Reason' }); if (!reason) return; try { await reviewService.report(item.id, reason); showToast('Report submitted.'); } catch (error) { showToast(errorText(error), 'error'); } }} edit={async () => { const review = await promptAction({ title: 'Edit your review', message: 'Your changes will be sent for approval again.', defaultValue: item.review, confirmLabel: 'Save' }); if (!review) return; try { await reviewService.update(item.id, { review }); setReviews((rows) => rows.filter((row) => row.id !== item.id)); showToast('Review updated and sent for approval.'); } catch (error) { showToast(errorText(error), 'error'); } }} remove={async () => { if (!await confirmAction({ title: 'Delete review?', message: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true })) return; try { await reviewService.remove(item.id); setReviews((rows) => rows.filter((row) => row.id !== item.id)); loadSummary(); } catch (error) { showToast(errorText(error), 'error'); } }} />)}</div>
    {!loading && !reviews.length && <div className="mt-6 rounded-[22px] border border-dashed bg-white p-10 text-center"><h3 className="font-display text-2xl font-semibold">No reviews found</h3><p className="mt-2 text-sm text-[#68706B]">Be the first to share your LitePuff experience.</p></div>}
    {pagination.hasMore && <button onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} className="mx-auto mt-6 block h-12 rounded-full border px-7 text-sm font-semibold">Load More</button>}
    <WriteReview open={modal} close={() => setModal(false)} busy={busy} submit={async (payload) => { setBusy(true); try { await reviewService.create(product.id, payload); setModal(false); showToast('Review submitted for approval.'); } catch (error) { showToast(errorText(error), 'error'); } finally { setBusy(false); } }} />
  </section>;
}
