import { Link, createFileRoute } from '@tanstack/react-router'
import {
  LegalPage,
  legalLinkClass,
  type LegalSection,
} from '../components/legal-page'
import { CONTACT_EMAIL, OPERATOR } from '../lib/legal'

export const Route = createFileRoute('/privacy')({
  component: Privacy,
  head: () => ({
    meta: [
      { title: 'Privacy policy · Mealy' },
      {
        name: 'description',
        content:
          'What Mealy collects, why, who processes it, and how to get it ' +
          'deleted.',
      },
    ],
  }),
})

const UPDATED = '19 August 2026'

const EMAIL_LINK = (
  <a href={`mailto:${CONTACT_EMAIL}`} className={legalLinkClass}>
    {CONTACT_EMAIL}
  </a>
)

const SECTIONS: LegalSection[] = [
  {
    heading: 'Who we are',
    blocks: [
      {
        text: `Mealy is operated by ${OPERATOR}, a company registered in South Africa. Where this policy says “we”, it means that company. We are the responsible party under the Protection of Personal Information Act (POPIA) and the data controller under the UK and EU GDPR for the information described below.`,
      },
      { text: <>Write to us at {EMAIL_LINK} about anything on this page.</> },
    ],
  },
  {
    heading: 'What we collect',
    blocks: [
      { text: 'We collect four things, and nothing else.' },
      {
        list: [
          <>
            <strong className="font-medium text-ink-900">
              Your account details.
            </strong>{' '}
            Your name, your email address and your profile picture, when your
            sign-in method supplies one. Our sign-in provider, Clerk, holds
            these and your password. We never see your password.
          </>,
          <>
            <strong className="font-medium text-ink-900">
              What you put in the app.
            </strong>{' '}
            Your recipes, the meals you plan, your shopping lists, the name of
            your household and the display name your household sees.
          </>,
          <>
            <strong className="font-medium text-ink-900">Invite links.</strong>{' '}
            When you invite someone to your household we store the link’s token,
            who created it, who accepted it and when.
          </>,
          <>
            <strong className="font-medium text-ink-900">
              Technical records.
            </strong>{' '}
            Our hosting and backend providers log the usual server data: IP
            address, browser type, the page or function requested and the time.
            These keep the service running and let us investigate abuse.
          </>,
        ],
      },
      {
        text: 'We do not collect your location, we do not take payment details, and there are no analytics or advertising trackers in Mealy.',
      },
    ],
  },
  {
    heading: 'Signing in with Google',
    blocks: [
      {
        text: 'If you choose to sign in with Google, Google tells us your name, your email address and your profile picture. We use them only to create your account, to sign you in and to show you to the other members of your household. We ask for nothing else, and we do not read your Gmail, Drive, Contacts or Calendar.',
      },
      {
        text: (
          <>
            Mealy’s use of information received from Google APIs follows the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className={legalLinkClass}
              target="_blank"
              rel="noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We do not transfer that
            data to anyone except the providers listed below, we do not use it
            for advertising, and no human reads it except where you ask us to
            for support.
          </>
        ),
      },
      {
        text: (
          <>
            You can disconnect Mealy from your Google account at any time at{' '}
            <a
              href="https://myaccount.google.com/permissions"
              className={legalLinkClass}
              target="_blank"
              rel="noreferrer"
            >
              myaccount.google.com/permissions
            </a>
            . That stops future sign-ins. To remove the data we already hold,
            delete your account as described below.
          </>
        ),
      },
    ],
  },
  {
    heading: 'Why we use it',
    blocks: [
      {
        list: [
          'To run your account and show you your recipes, plans and lists. Our legal basis is performance of the contract you accept by using Mealy.',
          'To let the people in your household see the same data as you. Same basis.',
          'To keep the service secure and to investigate abuse or faults. Our legal basis is our legitimate interest in a working, unabused service.',
          'To reply when you contact us. Our legal basis is our legitimate interest in answering you.',
          'To meet a legal obligation, if we are ever required to.',
        ],
      },
      {
        text: 'We do not sell your personal information. We do not share it with advertisers, and we do not profile you.',
      },
    ],
  },
  {
    heading: 'Cookies',
    blocks: [
      {
        text: 'Clerk sets cookies that keep you signed in and protect the sign-in form. Cloudflare may set a cookie to tell real visitors from bots. Both are necessary for the service to work, so Mealy has no cookie banner. There are no analytics or advertising cookies to consent to.',
      },
    ],
  },
  {
    heading: 'Who else processes it',
    blocks: [
      {
        text: 'Mealy is built on four services. Each is bound by its own contract to process data only on our instructions.',
      },
      {
        list: [
          <>
            <strong className="font-medium text-ink-900">Clerk</strong>, for
            sign-in and account records. United States.
          </>,
          <>
            <strong className="font-medium text-ink-900">Convex</strong>, for
            the database and the server functions that read it. United States.
          </>,
          <>
            <strong className="font-medium text-ink-900">Cloudflare</strong>,
            for hosting and delivery. Global network.
          </>,
          <>
            <strong className="font-medium text-ink-900">Google</strong>, only
            if you choose to sign in with Google.
          </>,
        ],
      },
      {
        text: 'These providers are outside South Africa and outside the EEA, so your information is transferred across borders. We rely on their standard contractual terms and their own compliance commitments for those transfers, as POPIA section 72 and Chapter V of the GDPR allow.',
      },
    ],
  },
  {
    heading: 'What your household can see',
    blocks: [
      {
        text: 'Mealy is built around shared kitchens, so this is worth being blunt about. Every member of your household can see, edit and delete every recipe, plan and list in it, and can see your display name. Anyone who opens your invite link while it is valid joins your household and gains that access.',
      },
      {
        text: 'An invite link works once and expires after a week, and creating a new one retires the old. Treat it like a key. If you leave a household, the recipes, plans and lists you created stay with the people still there, because that data is not one person’s to take back.',
      },
    ],
  },
  {
    heading: 'How long we keep it',
    blocks: [
      {
        text: 'We keep your account details and your kitchen data for as long as your account exists. Delete a recipe, a plan or a list and it is gone from the database.',
      },
      {
        text: (
          <>
            To delete everything, email {EMAIL_LINK} from your account address
            and we will remove your account, your household membership and any
            household that only you belong to, within 30 days. Provider backups
            may hold a copy for a short period after that before they roll off.
            Content you created in a household you share with other people stays
            with that household.
          </>
        ),
      },
      {
        text: 'Server logs are kept only as long as our providers retain them, which is a matter of weeks.',
      },
    ],
  },
  {
    heading: 'Your rights',
    blocks: [
      {
        text: 'Under POPIA and the GDPR you can ask us to give you a copy of the personal information we hold about you, correct it, delete it, restrict what we do with it, or object to us processing it. You can also ask for it in a portable format.',
      },
      {
        text: (
          <>
            Email {EMAIL_LINK} from the address on your account. We answer
            within 30 days and we do not charge for it.
          </>
        ),
      },
      {
        text: (
          <>
            If you are not happy with our answer you can complain to the{' '}
            <a
              href="https://inforegulator.org.za"
              className={legalLinkClass}
              target="_blank"
              rel="noreferrer"
            >
              Information Regulator of South Africa
            </a>
            . If you live in the UK or the EEA, you can complain to your own
            supervisory authority instead.
          </>
        ),
      },
    ],
  },
  {
    heading: 'How we protect it',
    blocks: [
      {
        text: 'Every connection to Mealy uses HTTPS. Clerk holds your credentials, so a password never reaches our code or our database. Every record in the database is scoped to a household, and every server function checks your membership before it reads or writes.',
      },
      {
        text: 'No service can promise perfect security. If a breach ever affects your personal information, we will tell you and the Information Regulator as POPIA requires.',
      },
    ],
  },
  {
    heading: 'Children',
    blocks: [
      {
        text: 'Mealy is a cooking app and children are welcome to use it. If you are under 18, ask a parent or guardian before you create an account. POPIA asks that they consent on your behalf. A parent or guardian can email us at any time to see what we hold about a child in their care, or to have it deleted.',
      },
    ],
  },
  {
    heading: 'Changes to this policy',
    blocks: [
      {
        text: 'When this policy changes we update the date at the top of this page. If a change materially affects how we use your information, we will tell you by email before it takes effect.',
      },
    ],
  },
  {
    heading: 'Contact',
    blocks: [
      {
        text: (
          <>
            {OPERATOR}, South Africa. Email {EMAIL_LINK}.
          </>
        ),
      },
    ],
  },
]

function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated={UPDATED}
      intro={
        <>
          Mealy stores your recipes, your weekly plan and your shopping lists,
          and shares them with the household you cook with. This page says what
          that means for your personal information. The{' '}
          <Link to="/terms" className={legalLinkClass}>
            terms of service
          </Link>{' '}
          cover the rest.
        </>
      }
      sections={SECTIONS}
    />
  )
}
