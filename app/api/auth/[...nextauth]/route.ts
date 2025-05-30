import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { NextAuthOptions } from "next-auth";
import { Session } from "next-auth";

// Function to determine the correct base URL
function getBaseUrl() {
  // First check NEXTAUTH_URL environment variable (explicitly set in production)
  if (process.env.NEXTAUTH_URL) {
    console.log("Using NEXTAUTH_URL from env:", process.env.NEXTAUTH_URL);
    return process.env.NEXTAUTH_URL;
  }

  // For production deployment on render.com
  if (process.env.NODE_ENV === "production") {
    console.log("Using production URL for render.com");
    return "https://beatcode.onrender.com";
  }

  // Local development fallback
  console.log("Using default local URL");
  return "http://localhost:3000";
}

// Define your auth options
const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login?auth_error=true',
  },
  basePath: "/api/auth",
  debug: true, // Temporarily enable debug mode to see more detailed errors
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV !== "production",
  logger: {
    error(code, metadata) {
      console.error(`Auth error: ${code}`, metadata);
    },
    warn(code) {
      console.warn(`Auth warning: ${code}`);
    },
  },
  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      console.log("Auth redirect callback triggered");
      console.log("Redirecting from:", url);
      console.log("Base URL:", baseUrl);
      
      // Ensure baseUrl matches the environment
      const currentBaseUrl = process.env.NEXTAUTH_URL || baseUrl;
      
      // If the URL is relative, make it absolute
      if (url.startsWith('/')) {
        return `${currentBaseUrl}${url}`;
      }
      
      // If it's already an absolute URL
      if (url.startsWith('http')) {
        // Only allow URLs from our domain
        const urlObject = new URL(url);
        const baseUrlObject = new URL(currentBaseUrl);
        
        if (urlObject.hostname === baseUrlObject.hostname) {
          return url;
        }
        return currentBaseUrl;
      }

    console.log("Calculated Base URL:", getBaseUrl());
      
      // Check if this is an absolute URL (external site)
      if (url.startsWith("http")) {
        // Only allow redirects to our own domain
        if (url.startsWith(baseUrl)) {
          console.log("Redirecting to absolute URL:", url);
          return url;
        } else {
          console.warn("Blocked redirect to external URL:", url);
          return baseUrl;
        }
      }

      // Default to editor page if no specific redirect was provided
      // Or use the callback URL if provided
      const finalRedirect = url === baseUrl || url === `${baseUrl}/` 
        ? `${baseUrl}/editor` 
        : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
      
      console.log("Final redirect URL:", finalRedirect);
      return finalRedirect;
    },
    
    // Add session callback for additional logging
    async session({ session, token }) {
      console.log("Session callback triggered");
      console.log("Session user:", session.user?.name || "No user");
      
      // You can enhance the session with additional user data if needed
      return session;
    },
    
    // Add JWT callback for token debugging
    async jwt({ token, account, profile }) {
      console.log("JWT callback triggered");
      console.log("Token subject:", token.sub || "No subject");
      
      if (account) {
        console.log("Auth provider:", account.provider);
      }
      
      return token;
    },
  },
  // Explicitly set the auth secret
  secret: process.env.NEXTAUTH_SECRET,
};

// Export the HTTP handlers
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };