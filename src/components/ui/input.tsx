import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // Always render a concrete `type` on <input>. When `type` is omitted the
  // server renders <input .../> with no type attribute, but the browser
  // (and password-manager / autofill browser extensions) may inject or infer
  // a type attribute before hydration, producing a hydration mismatch on the
  // auth form inputs that don't explicitly pass a `type` prop. Defaulting to
  // `text` makes the server-rendered HTML and the hydrated DOM identical.
  return (
    <input
      type={type ?? "text"}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }