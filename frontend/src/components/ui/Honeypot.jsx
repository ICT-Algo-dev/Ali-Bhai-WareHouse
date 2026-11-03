import { forwardRef } from 'react'

const Honeypot = forwardRef(function Honeypot(_, ref) {
  return (
    <div
      className="absolute left-[-9999px] h-px w-px overflow-hidden"
      aria-hidden="true"
    >
      <input
        ref={ref}
        id="hp_field_x7"
        name="hp_field_x7"
        type="text"
        autoComplete="off"
        tabIndex={-1}
        inputMode="none"
      />
    </div>
  )
})

export default Honeypot
