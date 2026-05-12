export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FCFBF9] p-4 sm:p-6">
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}
