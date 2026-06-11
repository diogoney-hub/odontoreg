import "./globals.css";

export const metadata = {
  title: "OdontoConforme AI",
  description: "Auditoria e Inteligência Artificial para Clínicas Odontológicas",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&family=Fraunces:wght@600&family=Hanken+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style>{`
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
          .material-symbols-outlined.filled {
            font-variation-settings: 'FILL' 1;
          }
        `}</style>
      </head>
      <body className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
