export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] p-4">
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}
