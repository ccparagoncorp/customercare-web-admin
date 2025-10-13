interface LoginBackgroundProps {
  backgroundImage?: string;
  overlayOpacity?: number;
  className?: string;
}

export default function LoginBackground({ 
  backgroundImage = 'login.png',
  className = ''
}: LoginBackgroundProps) {
  return (
    <>
      {/* Background Image */}
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${className}`}
        style={{
          backgroundImage: `url('/${backgroundImage}')`,
        }}
      />
      
      {/* Additional Decorative Elements */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-white/5 to-transparent rounded-full blur-2xl"></div>
    </>
  );
}
