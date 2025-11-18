import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "What is chipereganyu?",
      answer: "Chipereganyu is a traditional African way of saving money together. A group of people you trust come together. Each person saves money on a schedule they choose: daily, weekly, or monthly. Each cycle, one person gets all the money. This continues until everyone has had their turn. It helps you save big amounts of money faster than saving alone.",
    },
    {
      question: "How is PayFesa different from traditional chipereganyu?",
      answer: "PayFesa makes chipereganyu easier and safer. You do not need to meet in person. Money is collected automatically from your mobile money or bank account. Payments happen on time, every time. Your money is tracked digitally so nothing gets lost. You get your payout instantly to your account.",
    },
    {
      question: "How much does PayFesa cost?",
      answer: "PayFesa charges an 11% platform maintenance fee on each payout. This fee covers the technology that keeps your money safe, tracks payments, and sends money automatically. There are no hidden fees. You only pay when you receive your payout.",
    },
    {
      question: "Is my money safe with PayFesa?",
      answer: "Yes. Every payout is fully protected. When it is your turn, you get your money. PayFesa works with trusted mobile money and banking services in Malawi. We use security technology to protect your information. Your chipereganyu group is made of people you choose and trust.",
    },
    {
      question: "What payment methods can I use?",
      answer: "You can use mobile money accounts like Airtel Money and TNM Mpamba. You can also link your bank account. All payment methods are secure and protected.",
    },
    {
      question: "Can I see all the payments in my group?",
      answer: "Yes. Full Transparency means you can see everything in real time. Check who paid on time. See who missed a payment. Know exactly when your turn is coming. No secrets. No confusion. Everything is clear in the app.",
    },
    {
      question: "What does Save Together, Rise Together mean?",
      answer: "This is our community pillar. When you pay on time, your trust score grows. High trust scores earn you bonuses on every payout. When your whole group does well, everyone gets rewarded. Your success helps others. Their success helps you.",
    },
    {
      question: "How do I earn bonuses on my payout?",
      answer: "Build a high trust score by paying on time every cycle. The higher your trust score, the bigger your bonus when you receive your payout. PayFesa rewards members who help their groups succeed.",
    },
    {
      question: "How do I join a chipereganyu group?",
      answer: "You can join in two ways. First, you can create your own group and invite friends and family you trust. Second, you can join an existing group using a group code and the inviter's name. Choose people you know and trust.",
    },
    {
      question: "What happens if someone does not pay?",
      answer: "PayFesa collects money automatically from mobile money or bank accounts. This means everyone pays on time. If there is a problem with someone's payment, the group admin gets a notification. This way, issues are solved quickly before they become big problems.",
    },
    {
      question: "When do I get my money?",
      answer: "You get your money when it is your turn in the rotation. The group decides the order at the start. When your turn comes, all the money collected that cycle goes straight to your mobile money or bank account. No waiting for meetings. No delays.",
    },
    {
      question: "Can I be in more than one group?",
      answer: "Yes, you can join as many chipereganyu groups as you want. Many people join different groups to save for different goals. One group for school fees, another for business, another for emergencies. You choose what works for you.",
    },
    {
      question: "What if I need to leave a group?",
      answer: "You can leave a group, but timing matters. If you have not received your payout yet, you should stay until you get your turn. If you have already received your payout, talk to your group admin about leaving properly. Always communicate with your group.",
    },
    {
      question: "How many people can be in a group?",
      answer: "A chipereganyu group can have between 5 and 20 members. Smaller groups finish the rotation faster. Larger groups collect more money each cycle. Choose the size that works best for your goals.",
    },
    {
      question: "Do I need a smartphone to use PayFesa?",
      answer: "Yes, you need a smartphone with internet access. You also need a mobile money account like Airtel Money or TNM Mpamba, or a bank account. The PayFesa app works on both Android and iPhone devices.",
    },
    {
      question: "What if I have more questions?",
      answer: "We are here to help. You can email us at support@payfesa.com or message us on WhatsApp at +265 98 331 1818. Our team will answer all your questions and help you get started.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h1 className="text-3xl md:text-5xl font-bold mb-6">
                Frequently Asked Questions
              </h1>
              <p className="text-lg md:text-xl text-charcoal leading-relaxed">
                Learn more about PayFesa and online chipereganyu groups. Find answers to common questions below.
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="border-2 rounded-lg px-6 bg-card"
                  >
                    <AccordionTrigger className="text-left hover:text-primary">
                      <span className="font-bold">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-charcoal leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
