import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Fieldnote — Your templates, intact',description:'Bring your Spectora templates with you. Review, preserve, and make them your own.'};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
