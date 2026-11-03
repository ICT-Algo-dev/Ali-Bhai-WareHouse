import { Link } from 'react-router-dom'

const styles = {
  primary: 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm',
  navy: 'bg-navy-900 text-white hover:bg-navy-800 shadow-sm',
  outline: 'border border-navy-200 bg-white text-navy-900 hover:border-navy-400 hover:bg-navy-50',
  light: 'bg-white text-navy-900 hover:bg-navy-50',
}

export default function Button({
  children,
  variant = 'primary',
  to,
  href,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant] || styles.primary} ${className}`

  if (to) return <Link to={to} className={classes} {...props}>{children}</Link>
  if (href) return <a href={href} className={classes} {...props}>{children}</a>
  return <button type={type} className={classes} {...props}>{children}</button>
}
