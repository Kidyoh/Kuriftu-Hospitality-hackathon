
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary">404</h1>
        <p className="text-xl text-muted-foreground mb-4">
          We couldn't find the page you're looking for
        </p>
        <a href="/" className="text-secondary hover:text-secondary/80 underline">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
