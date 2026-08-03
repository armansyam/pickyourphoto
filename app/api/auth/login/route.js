import { generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
        }

        const stmt = db.prepare('SELECT id, name, email, password, role, status FROM vendors WHERE email = ?');
        const vendor = stmt.get(email.toLowerCase().trim());

        if (!vendor) {
            return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, vendor.password);

        if (!isPasswordValid) {
            return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
        }

        // Account status validations
        if (vendor.status === 'pending') {
            return NextResponse.json({ message: 'Pendaftaran Anda sedang menunggu konfirmasi/persetujuan dari administrator.' }, { status: 401 });
        }

        if (vendor.status === 'suspended') {
            return NextResponse.json({ message: 'Akun Anda telah ditangguhkan. Silakan hubungi administrator.' }, { status: 401 });
        }

        const token = generateToken({ id: vendor.id, name: vendor.name, email: vendor.email, role: vendor.role });
        setAuthCookie(token);

        return NextResponse.json({ success: true, message: 'Login successful.' });

    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
    }
}