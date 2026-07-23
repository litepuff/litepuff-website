import { FiAlertCircle, FiEye, FiEyeOff } from "react-icons/fi";
import { useState } from "react";

export default function FormField({
  label,
  error,
  hint,
  type = "text",
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#243029]">
      {label}
      <span className="relative">
        <input
          type={password && visible ? "text" : type}
          {...props}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${props.name}-error` : undefined}
          className={`h-14 w-full rounded-2xl border bg-white px-4 text-[15px] font-normal outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-[#9A9E9B]/70 focus:border-[#1E4D3A] focus:shadow-[0_0_0_3px_rgba(30,77,58,0.08)] ${password ? "pr-12" : ""} ${error ? "border-[#B94A3C]" : "border-[#DED9CF]"}`}
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#657069] outline-none transition hover:bg-[#F5F2EB] focus-visible:ring-2 focus-visible:ring-[#C89B3C]"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
      </span>
      {error ? (
        <span
          id={`${props.name}-error`}
          className="flex items-center gap-1.5 text-xs font-medium leading-5 text-[#A43E32]"
        >
          <FiAlertCircle className="shrink-0" />
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs font-normal text-[#747C77]">{hint}</span>
      ) : null}
    </label>
  );
}
