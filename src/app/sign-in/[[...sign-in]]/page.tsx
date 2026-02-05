import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default function SignInPage() {
  return (
    <AuthLayout mode="sign-in">
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "shadow-none w-full",
            card: "shadow-none !p-0 w-full bg-transparent border-none",
            header: "hidden",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            main: "gap-4",
            form: "gap-4",
            formFieldRow: "gap-4",
            socialButtonsBlockButton:
              "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg h-12 font-medium transition-all shadow-none",
            socialButtonsBlockButtonText: "font-medium text-sm",
            socialButtonsBlockButtonArrow: "hidden",
            socialButtonsProviderIcon: "w-5 h-5",
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-400 text-sm bg-white px-3",
            dividerRow: "my-4",
            formFieldLabel: "text-gray-700 font-medium text-sm mb-1.5",
            formFieldInput:
              "rounded-lg border border-gray-300 h-12 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white text-gray-900 placeholder:text-gray-400",
            formFieldInputShowPasswordButton: "text-gray-500 hover:text-gray-700",
            formButtonPrimary:
              "bg-gray-900 hover:bg-gray-800 text-white rounded-full h-12 font-medium transition-all shadow-none normal-case",
            formFieldAction: "text-gray-500 hover:text-gray-700 text-sm",
            formFieldHintText: "text-gray-500 text-xs",
            footerAction: "hidden",
            footerActionLink: "hidden",
            footer: "hidden",
            footerPages: "hidden",
            footerPagesLink: "hidden",
            identityPreview: "bg-gray-50 border-gray-200 rounded-lg",
            identityPreviewText: "text-gray-700",
            identityPreviewEditButton: "text-gray-500 hover:text-gray-700",
            formResendCodeLink: "text-gray-900 hover:text-gray-700",
            otpCodeFieldInput: "border-gray-300 focus:ring-gray-900 h-12",
            alert: "rounded-lg",
            alertText: "text-sm",
            logoBox: "hidden",
            logoImage: "hidden",
            badge: "hidden",
            internal: "hidden",
          },
          layout: {
            socialButtonsPlacement: "bottom",
            socialButtonsVariant: "blockButton",
            showOptionalFields: true,
            shimmer: false,
          },
          variables: {
            colorPrimary: "#111827",
            colorText: "#111827",
            colorTextSecondary: "#6B7280",
            colorBackground: "transparent",
            colorInputBackground: "#FFFFFF",
            colorInputText: "#111827",
            borderRadius: "0.5rem",
            fontFamily: "inherit",
            spacingUnit: "1rem",
          },
        }}
      />
    </AuthLayout>
  );
}
