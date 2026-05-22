import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { LearningMaterialSection } from '@/components/landing/LearningMaterialSection';
import { LearningResourcesSection } from '@/components/landing/LearningResourcesSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function Home() {
  return (
    <>
      <LandingNavbar />
      <HeroSection />
      <LearningMaterialSection />
      <LearningResourcesSection />
      <LandingFooter />
    </>
  );
}
