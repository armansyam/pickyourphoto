import './globals.css';
import DevWatermark from '@/components/DevWatermark';

export const metadata = {
    title: 'Pick Your Photo — Platform Seleksi Foto Digital',
    description: 'Platform seleksi foto digital terpercaya untuk fotografer & studio foto profesional.',
    icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon.png',
        apple: '/icon.png',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                {children}
                <DevWatermark />
            </body>
        </html>
    );
}