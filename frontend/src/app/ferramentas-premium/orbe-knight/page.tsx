import OrbeKnightPromo from '@/components/OrbeKnightPromo';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function OrbeKnightPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0f] pt-16 flex flex-col">
            <Header />
            <div className="flex-1 flex flex-col justify-center">
                <OrbeKnightPromo />
            </div>
            <Footer />
        </main>
    );
}
