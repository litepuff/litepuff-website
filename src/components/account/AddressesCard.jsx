import { useState } from "react";
import { FiEdit2, FiMapPin, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import FormField from "./FormField";

const empty = {
  name: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};
export default function AddressesCard({ addresses, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");
  const open = (address = null) => {
    setEditing(address?.id || "new");
    setForm(address || empty);
  };
  const remove = async (id) => {
    if (deleting) return;
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting("");
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(editing === "new" ? null : editing, form);
      setEditing(null);
      setForm(empty);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      id="addresses"
      className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-[#E9E4DA] bg-white p-5 shadow-soft sm:p-7"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-[#9A7430]">
            DELIVERY DETAILS
          </p>
          <h2 className="mt-1 text-3xl font-semibold">Saved Addresses</h2>
        </div>
        <button
          type="button"
          disabled={saving || Boolean(deleting)}
          onClick={() => open()}
          className="flex h-11 items-center gap-2 rounded-full bg-[#1E4D3A] px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiPlus /> Add New
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((address) => (
          <article
            key={address.id}
            className="rounded-2xl border border-[#E8E3D9] p-4"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF3EF] text-[#1E4D3A]">
                <FiMapPin />
              </span>
              {address.isDefault && (
                <span className="rounded-full bg-[#F5EBD6] px-2 py-1 text-[10px] font-bold uppercase text-[#8A6424]">
                  Default
                </span>
              )}
            </div>
            <h3 className="mt-3 text-xl font-semibold">{address.name}</h3>
            <p className="mt-1 text-sm leading-6 text-[#68706B]">
              {address.addressLine}
              <br />
              {address.city}, {address.state} {address.pincode}
              <br />
              {address.phone}
            </p>
            <div className="mt-3 flex gap-4 text-xs font-semibold">
              <button
                type="button"
                disabled={saving || Boolean(deleting)}
                onClick={() => open(address)}
                className="flex min-h-11 items-center gap-1 text-[#1E4D3A] disabled:opacity-50"
              >
                <FiEdit2 /> Edit
              </button>
              <button
                type="button"
                disabled={saving || Boolean(deleting)}
                onClick={() => remove(address.id)}
                className="flex min-h-11 items-center gap-1 text-[#9A392F] disabled:opacity-50"
              >
                <FiTrash2 /> {deleting === address.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {!addresses.length && (
        <p className="rounded-2xl bg-[#F8F6F0] p-6 text-center text-sm text-[#747C77]">
          No saved addresses yet.
        </p>
      )}
      {editing && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[#14251D]/40 p-0 sm:items-center sm:p-5"
          onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          <form
            onSubmit={submit}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px] sm:p-8"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-3xl font-semibold">
                {editing === "new" ? "Add an address" : "Edit address"}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-2"
              >
                <FiX />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Address name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <FormField
                label="Phone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <div className="sm:col-span-2">
                <FormField
                  label="Address line"
                  required
                  value={form.addressLine}
                  onChange={(e) =>
                    setForm({ ...form, addressLine: e.target.value })
                  }
                />
              </div>
              <FormField
                label="City"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <FormField
                label="State"
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
              <FormField
                label="Pincode"
                required
                inputMode="numeric"
                pattern="[0-9]{4,10}"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
                className="accent-[#1E4D3A]"
              />{" "}
              Make default address
            </label>
            <button
              disabled={saving}
              className="mt-6 h-12 w-full rounded-full bg-[#1E4D3A] font-semibold text-white"
            >
              {saving ? "Saving…" : "Save Address"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
