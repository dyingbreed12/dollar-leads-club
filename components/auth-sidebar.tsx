import { Phone, Calendar, CheckCircle, DollarSign, Zap } from "lucide-react"
import Image from "next/image"

export function AuthSidebar() {
  return (
    <div
      className="bg-secondary relative hidden lg:block p-12"
      style={{
        backgroundImage: 'url(/assets/about-shape-1.png)',
        backgroundPosition: 'bottom left',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="flex h-full flex-col justify-center items-center text-center text-primary">
        {/* Header Section */}
        <Image src="/login-logo-img.png" alt="Logo" width={400} height={250} />
        
        <div className="mb-12">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Exclusive Motivated Seller Leads
          </h1>
          <p className="text-xl text-primary/90">
            The Costco of Pay-Per-Lead - Get qualified leads for less than $1
          </p>
        </div>


      </div>
    </div>
  )
}
