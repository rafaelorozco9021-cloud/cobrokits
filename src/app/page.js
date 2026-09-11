import Navbar from '@/components/Navbar';
import HeroCarousel from '@/components/HeroCarousel';
import StepByStep from '@/components/StepByStep';
import FeatureGrid from '@/components/FeatureGrid';
import GpsPreview from '@/components/GpsPreview';
import RoiCalculator from '@/components/RoiCalculator';
import PricingSection from '@/components/PricingSection';
import FaqAccordion from '@/components/FaqAccordion';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar />
      <HeroCarousel />
      <StepByStep />
      <FeatureGrid />
      <GpsPreview />
      <RoiCalculator />
      <PricingSection />
      <FaqAccordion />
      <Footer />
    </main>
  );
}
