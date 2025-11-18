import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import PullToRefresh from "@/components/PullToRefresh";
import BackToTop from "@/components/BackToTop";
import { toast } from "sonner";

const Index = () => {
  const handleRefresh = async () => {
    // Simulate content refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    toast.success('Content refreshed!');
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PullToRefresh onRefresh={handleRefresh}>
        <main>
          <Hero />
          <Stats />
          <Features />
          <HowItWorks />
          <Testimonials />
          <CTA />
        </main>
      </PullToRefresh>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Index;
