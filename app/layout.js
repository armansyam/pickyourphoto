import './globals.css';
import DevWatermark from '@/components/DevWatermark';

export const metadata = {
    title: 'Pick Your Photo',
    description: 'The easiest way to select your photos.',
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