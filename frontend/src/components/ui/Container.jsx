export default function Container({ children, className = '', as: Component = 'div', ...props }) {
  return <Component className={`mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10 ${className}`} {...props}>{children}</Component>
}
