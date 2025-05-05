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

  // For Vercel deployments
  if (process.env.VERCEL_URL) {
    console.log("Using VERCEL_URL from env:", `https://${process.env.VERCEL_URL}`);
    return `https://${process.env.VERCEL_URL}`;
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
      // Adding client config for more options
      authorization: {
        params: {
          // The space-separated scopes to request from GitHub
          scope: "read:user user:email",
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    // Adding error page for debugging
    error: '/login?auth_error=true',
  },
  // Explicitly set the base URL
  basePath: "/api/auth",
  // Debug mode - set to true during development
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