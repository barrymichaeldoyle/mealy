import type { ComponentProps } from 'react'
import type { ClerkProvider } from '@clerk/tanstack-react-start'

type Appearance = NonNullable<
  ComponentProps<typeof ClerkProvider>['appearance']
>

/*
 * Clerk renders its own markup, so the theme has to be handed to it as
 * literal values. These mirror the tokens in src/styles.css: change one,
 * change the other. See docs/DESIGN_Specification.md §2.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#2d5a3d', // basil-700
    colorBackground: '#faf7f0', // paper-50
    colorDanger: '#a83722', // tomato-700
    colorSuccess: '#2d5a3d', // basil-700
    fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    borderRadius: '10px', // --radius-card
  },
  elements: {
    headerTitle: {
      fontFamily: "'Fraunces Variable', Georgia, serif",
      fontWeight: 600,
      color: '#262115', // ink-900
    },
    formFieldInput: { backgroundColor: '#faf7f0' }, // paper-50
  },
}

/*
 * Only for the full-page /sign-in and /sign-up routes, where the form sits
 * straight on the paper. A white card floating on a cream page is the one
 * thing this design is trying not to be.
 *
 * It has to stay off the provider: `card` is also the modal from the landing
 * page and the popover behind the avatar, and a transparent card there leaves
 * the form floating over whatever is underneath it.
 */
export const flatCardAppearance: Appearance = {
  elements: {
    cardBox: { boxShadow: 'none', border: 'none' },
    card: {
      backgroundColor: 'transparent',
      boxShadow: 'none',
      border: 'none',
    },
    footer: { background: 'transparent' },
  },
}
