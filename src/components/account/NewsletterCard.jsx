import { useState } from "react";
import { FiMail } from "react-icons/fi";

export default function NewsletterCard({ subscribed, onSave }) {
  const [enabled, setEnabled] = useState(subscribed);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setSaving(true);
    await onSave(enabled);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };
  return (
    <section
      id="newsletter"
      className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-[#E9E4DA] bg-white p-5 shadow-soft sm:p-7"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5EBD6] text-[#8A6424]">
          <FiMail />
        </span>
        <div className="flex-1">
          <h2 className="text-3xl font-semibold">Receive LitePuff stories</h2>
          <p className="mt-1 text-sm text-[#68706B]">
            Get new launches, recipes and snack inspiration, thoughtfully
            delivered.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-[#1E4D3A]" : "bg-[#C8CBC8]"}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`}
              />
            </button>
            <span className="mr-auto text-sm font-semibold">
              {enabled ? "Subscribed" : "Unsubscribed"}
            </span>
            <button
              onClick={save}
              disabled={saving}
              className="h-11 rounded-full border border-[#1E4D3A] px-5 text-sm font-semibold text-[#1E4D3A]"
            >
              {saved
                ? "Preferences saved"
                : saving
                  ? "Saving…"
                  : "Save Preferences"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
