import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiEye, FiEyeOff, FiMessageSquare, FiPlay, FiRefreshCw, FiSearch, FiShield, FiTrash2, FiX } from 'react-icons/fi';
import AdminStatCard from '../../components/admin/AdminStatCard.jsx';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge.jsx';
import { adminService } from '../../services/adminService';
import { PageTitle } from './AdminProductsPage.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const tabs = ['pending', 'approved', 'rejected', 'hidden', 'spam', 'deleted'];
const rejectionReasons = ['Spam', 'Abusive Language', 'Fake Review', 'Irrelevant', 'Duplicate', 'Other'];
const attributeRatings = [['tasteRating', 'Taste'], ['freshnessRating', 'Freshness'], ['packagingRating', 'Packaging'], ['crunchinessRating', 'Crunchiness'], ['valueRating', 'Value']];

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [filters, setFilters] = useState({ search: '', rating: '', verified: '', sort: 'newest' });
  const [rejecting, setRejecting] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { confirmAction, promptAction, showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.reviews({ status: tab, ...filters, limit: 100 });
      setReviews(data.reviews || []);
      setStatistics(data.statistics || {});
    } catch (error) {
      showToast(error.response?.data?.error || 'Reviews could not be loaded.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast, tab]);

  useEffect(() => {
    const timeout = window.setTimeout(load, filters.search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [load, filters.search]);

  async function moderate(review, action, reason) {
    try {
      await adminService.updateReview(review.id, { action, ...(reason ? { reason } : {}) });
      showToast(`Review ${action === 'spam' ? 'marked as spam' : `${action}d`}.`);
      await load();
    } catch (error) {
      showToast(error.response?.data?.error || 'Moderation update failed.', 'error');
    }
  }

  async function reply(review) {
    const message = await promptAction({ title: 'Reply from LitePuff', message: 'This reply will appear publicly below the review after approval.', placeholder: 'Thank you for your valuable feedback.', defaultValue: review.adminReply, confirmLabel: 'Publish Reply' });
    if (!message) return;
    try {
      await adminService.replyReview(review.id, message);
      showToast('Official reply published.');
      await load();
    } catch (error) {
      showToast(error.response?.data?.error || 'Reply could not be published.', 'error');
    }
  }

  async function softDelete(review) {
    const confirmed = await confirmAction({ title: 'Delete review?', message: 'The review will be hidden everywhere but can be restored from the Deleted tab.', confirmLabel: 'Delete', destructive: true });
    if (confirmed) await moderate(review, 'delete');
  }

  const stats = [
    ['Pending Reviews', statistics.pending || 0],
    ['Approved Reviews', statistics.approved || 0],
    ['Average Rating', Number(statistics.averageRating || 0).toFixed(1)],
    ['Reviews This Week', statistics.thisWeek || 0],
    ['Spam Reviews', statistics.spam || 0],
    ['Rejected Reviews', statistics.rejected || 0]
  ];

  return (
    <section className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageTitle eyebrow="Reviews" title="Review moderation" />
        <button type="button" onClick={load} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-brand-border bg-white px-5 text-sm font-bold">
          <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map(([label, value]) => <AdminStatCard key={label} label={label} value={loading ? '…' : value} />)}
      </div>

      <div className="rounded-[24px] border border-brand-border bg-white shadow-sm">
        <div className="flex gap-2 overflow-x-auto border-b border-brand-border p-4" role="tablist" aria-label="Review statuses">
          {tabs.map((status) => (
            <button key={status} type="button" role="tab" aria-selected={tab === status} onClick={() => setTab(status)} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold capitalize transition ${tab === status ? 'bg-brand-primary text-white' : 'bg-brand-background text-brand-muted hover:text-brand-text'}`}>
              {status}
            </button>
          ))}
        </div>

        <div className="grid gap-3 border-b border-brand-border p-4 md:grid-cols-[minmax(220px,1fr)_repeat(3,auto)]">
          <label className="relative">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search customer, product or review…" className="h-11 w-full rounded-2xl border border-brand-border bg-brand-background pl-11 pr-4 text-sm" />
          </label>
          <select aria-label="Filter by rating" value={filters.rating} onChange={(event) => setFilters((current) => ({ ...current, rating: event.target.value }))} className="h-11 rounded-2xl border border-brand-border bg-brand-background px-4 text-sm">
            <option value="">All ratings</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
          </select>
          <select aria-label="Filter by verification" value={filters.verified} onChange={(event) => setFilters((current) => ({ ...current, verified: event.target.value }))} className="h-11 rounded-2xl border border-brand-border bg-brand-background px-4 text-sm">
            <option value="">All purchases</option><option value="true">Verified</option><option value="false">Unverified</option>
          </select>
          <select aria-label="Sort reviews" value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))} className="h-11 rounded-2xl border border-brand-border bg-brand-background px-4 text-sm">
            <option value="newest">Newest</option><option value="oldest">Oldest</option>
          </select>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          {loading ? [...Array(3)].map((_, index) => <div key={index} className="h-64 animate-pulse rounded-[22px] bg-brand-background" />) : reviews.map((review) => (
            <ReviewModerationCard key={review.id} review={review} onApprove={() => moderate(review, 'approve')} onReject={() => { setRejecting(review); setRejectionReason(''); }} onHide={() => moderate(review, review.hidden ? 'unhide' : 'hide')} onSpam={() => moderate(review, 'spam')} onDelete={() => softDelete(review)} onRestore={() => moderate(review, 'restore')} onReply={() => reply(review)} />
          ))}
          {!loading && !reviews.length ? <div className="py-14 text-center"><FiShield className="mx-auto h-9 w-9 text-brand-muted" /><h2 className="mt-3 font-display text-2xl font-black">No {tab} reviews</h2><p className="mt-1 text-sm text-brand-muted">There are no reviews in this moderation queue.</p></div> : null}
        </div>
      </div>

      <AnimatePresence>
        {rejecting ? (
          <motion.div className="fixed inset-0 z-[100] grid place-items-end bg-brand-text/40 backdrop-blur-sm sm:place-items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setRejecting(null)}>
            <motion.form className="w-full max-w-md rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px]" initial={{ y: 24 }} animate={{ y: 0 }} onSubmit={async (event) => { event.preventDefault(); await moderate(rejecting, 'reject', rejectionReason); setRejecting(null); }}>
              <div className="flex items-center justify-between"><h2 className="font-display text-3xl font-black">Reject review</h2><button type="button" onClick={() => setRejecting(null)} aria-label="Close"><FiX /></button></div>
              <p className="mt-2 text-sm leading-6 text-brand-muted">Select the reason recorded with this moderation decision.</p>
              <label className="mt-5 block text-sm font-bold">Reason<select required value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-brand-border bg-brand-background px-4 font-normal"><option value="">Select a reason</option>{rejectionReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
              <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setRejecting(null)} className="rounded-full border border-brand-border">Cancel</button><button type="submit" className="rounded-full bg-rose-700 text-sm font-bold text-white">Reject Review</button></div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function ReviewModerationCard({ review, onApprove, onReject, onHide, onSpam, onDelete, onRestore, onReply }) {
  return (
    <article className="rounded-[22px] border border-brand-border p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            {review.customerPhoto ? <img src={review.customerPhoto} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-background font-black">{review.customerName?.[0] || 'C'}</span>}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-sans text-sm font-black">{review.customerName}</h2>{review.verifiedPurchase ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><FiCheckCircle /> Verified Purchase</span> : null}<AdminStatusBadge>{review.moderationStatus}</AdminStatusBadge></div>
              <p className="mt-1 text-xs text-brand-muted">{review.productName} · Order {review.orderId || 'Not linked'} · {new Date(review.createdAt).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3"><span className="text-lg tracking-wider text-brand-accent" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><strong>{review.rating}/5</strong></div>
          <h3 className="mt-2 font-sans text-base font-black">{review.title}</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-brand-muted">{review.review}</p>

          <div className="mt-4 flex flex-wrap gap-2">{attributeRatings.map(([key, label]) => <span key={key} className="rounded-full bg-brand-background px-3 py-1.5 text-xs"><b>{label}</b> {review[key]}/5</span>)}</div>
          {review.rejectedReason ? <p className="mt-3 text-sm font-bold text-rose-700">Rejection reason: {review.rejectedReason}</p> : null}
          {review.approvedAt ? <p className="mt-2 text-xs text-brand-muted">Approved by {review.approvedBy || 'Admin'} on {new Date(review.approvedAt).toLocaleString('en-IN')}</p> : null}

          {!!review.images?.length && <div className="mt-4 flex gap-2 overflow-x-auto">{review.images.map((image, index) => <a key={image.url} href={image.url} target="_blank" rel="noreferrer" className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-brand-border"><img src={image.thumbnail || image.url} alt={`Review upload ${index + 1}`} loading="lazy" className="h-full w-full object-cover" /></a>)}</div>}
          {review.video ? <a href={review.video} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand-border px-4 py-2 text-sm font-bold"><FiPlay /> View uploaded video</a> : null}
          {review.adminReply ? <div className="mt-4 rounded-2xl border-l-4 border-brand-primary bg-brand-background p-4"><p className="text-xs font-black uppercase tracking-wider text-brand-primary">Reply from LitePuff</p><p className="mt-2 text-sm">{review.adminReply}</p></div> : null}
        </div>

        <div className="flex w-full flex-wrap content-start gap-2 xl:w-56">
          {review.moderationStatus !== 'approved' && review.moderationStatus !== 'deleted' ? <Action icon={FiCheckCircle} label="Approve" onClick={onApprove} tone="success" /> : null}
          {!['rejected', 'deleted'].includes(review.moderationStatus) ? <Action icon={FiX} label="Reject" onClick={onReject} /> : null}
          {!['deleted', 'spam'].includes(review.moderationStatus) ? <Action icon={review.hidden ? FiEye : FiEyeOff} label={review.hidden ? 'Unhide' : 'Hide'} onClick={onHide} /> : null}
          {!['spam', 'deleted'].includes(review.moderationStatus) ? <Action icon={FiShield} label="Mark Spam" onClick={onSpam} /> : null}
          {review.moderationStatus === 'deleted' ? <Action icon={FiRefreshCw} label="Restore" onClick={onRestore} tone="success" /> : <Action icon={FiTrash2} label="Delete" onClick={onDelete} tone="danger" />}
          <Action icon={FiMessageSquare} label={review.adminReply ? 'Edit Reply' : 'Reply'} onClick={onReply} />
        </div>
      </div>
    </article>
  );
}

function Action({ icon: Icon, label, onClick, tone = 'default' }) {
  const color = tone === 'danger' ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : tone === 'success' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-brand-border text-brand-text hover:bg-brand-background';
  return <button type="button" onClick={onClick} className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-xs font-bold transition ${color}`}><Icon /> {label}</button>;
}
