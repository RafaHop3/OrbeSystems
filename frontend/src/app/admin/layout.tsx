export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-transparent text-neon-green font-mono selection:bg-neon-green selection:text-black">
      {children}
    </div>
  );
}
