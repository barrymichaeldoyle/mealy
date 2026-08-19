import { Link, createFileRoute } from '@tanstack/react-router'
import {
  LegalPage,
  legalLinkClass,
  type LegalSection,
} from '../components/legal-page'
import { CONTACT_EMAIL, OPERATOR } from '../lib/legal'

export const Route = createFileRoute('/terms')({
  component: Terms,
  head: () => ({
    meta: [
      { title: 'Terms of service · Mealy' },
      {
        name: 'description',
        content:
          'The rules for using Mealy: your account, your household, your ' +
          'content and what we promise.',
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
        text: `Mealy is operated by ${OPERATOR}, a company registered in South Africa. Where these terms say “we”, it means that company. Where they say “you”, they mean the person using Mealy.`,
      },
      {
        text: 'By creating an account or using Mealy you accept these terms. If you do not accept them, do not use Mealy.',
      },
    ],
  },
  {
    heading: 'Your account',
    blocks: [
      {
        list: [
          'If you are under 18, get a parent or guardian’s permission before you create an account. They accept these terms alongside you.',
          'Give an email address you can actually receive mail at. We use it to reach you about your account.',
          'Keep your sign-in details to yourself. Anything done from your account is treated as done by you.',
          'One person per account. Do not share a login. To share a kitchen, invite the other person to your household.',
          'Tell us at once if you think someone else has got into your account.',
        ],
      },
    ],
  },
  {
    heading: 'Households and shared data',
    blocks: [
      {
        text: 'A household is the unit of ownership in Mealy. Every recipe, plan and list belongs to one, not to a person. When you sign in for the first time you get a household of your own.',
      },
      {
        list: [
          'Every member of a household can see, edit and delete everything in it. There are no per-member permissions.',
          'An invite link lets whoever opens it join your household. It works once and expires after seven days, and creating a new link retires the previous one. Send it only to people you mean to give access to.',
          'If you leave a household, the recipes, plans and lists stay behind with the people still there. You go back to a household of your own.',
          'The owner of a household can remove a member. Removal does not delete what that member created.',
        ],
      },
      {
        text: 'Decide who you trust before you send an invite. We cannot undo what a household member does to shared data.',
      },
    ],
  },
  {
    heading: 'Your content',
    blocks: [
      {
        text: 'Your recipes, plans and lists are yours. We claim no ownership of them.',
      },
      {
        text: 'You give us the permission we need to run the service: to store your content, to process it, and to show it to the members of your household. That permission ends when you delete the content or your account, apart from copies sitting in provider backups until they roll off.',
      },
      { text: 'You must not put content into Mealy that:' },
      {
        list: [
          'infringes someone else’s copyright, including recipe text you have copied from a book or a site without permission,',
          'is unlawful, abusive, or targets somebody,',
          'contains malware, or somebody else’s personal information that you have no right to hold.',
        ],
      },
      {
        text: 'We do not review what you store. We will remove content and suspend accounts when we are told about a breach of these rules and we agree it is one.',
      },
    ],
  },
  {
    heading: 'Using the service properly',
    blocks: [
      {
        text: 'Use Mealy for cooking, and do not use it to attack anyone or anything. In particular, do not:',
      },
      {
        list: [
          'try to reach data that belongs to a household you are not a member of,',
          'probe, scan or overload the service, or work around its rate limits,',
          'scrape it, automate it beyond ordinary use, or resell access to it,',
          'copy the app to run it as a competing service.',
        ],
      },
    ],
  },
  {
    heading: 'Recipes are not advice',
    blocks: [
      {
        text: 'Mealy stores what you type. It does not check whether a recipe is safe, whether an ingredient will trigger an allergy, or whether a quantity makes sense.',
      },
      {
        text: 'The shopping list merges and rounds quantities for shopping, so an amount on a list is an approximation and never a cooking instruction. Volume and mass are never converted into one another. Read the recipe itself before you cook, and take your own advice on allergens, hygiene and anything you feed to other people.',
      },
    ],
  },
  {
    heading: 'Availability, changes and cost',
    blocks: [
      {
        text: 'Mealy is free. There is no subscription and nothing to buy.',
      },
      {
        text: 'It is offered as it is, with no uptime promise. We may change features, take features away, or stop running Mealy altogether. Keep your own copy of anything you cannot afford to lose.',
      },
    ],
  },
  {
    heading: 'Ending it',
    blocks: [
      {
        text: (
          <>
            You can stop using Mealy whenever you like. Download your data first
            if you want to keep it: the button is on the Household screen. To
            have your account and data deleted, email {EMAIL_LINK} from your
            account address. The{' '}
            <Link to="/privacy" className={legalLinkClass}>
              privacy policy
            </Link>{' '}
            explains what is deleted and what stays with a shared household.
          </>
        ),
      },
      {
        text: 'We may suspend or close an account that breaks these terms, or that puts the service or other people at risk. Where it is reasonable to do so, we will warn you first.',
      },
    ],
  },
  {
    heading: 'What we are responsible for',
    blocks: [
      {
        text: 'Mealy is provided as it is, without warranties of any kind, to the fullest extent the law allows. We do not warrant that it will be available, error free, or that your data will never be lost.',
      },
      {
        text: 'We are not liable for indirect or consequential loss, for lost profits, or for data loss.',
      },
      {
        text: 'None of this limits liability that cannot be limited by law, including liability for death or personal injury caused by our negligence, for fraud, and any right you have under the Consumer Protection Act 68 of 2008 that cannot be contracted out of.',
      },
    ],
  },
  {
    heading: 'Privacy',
    blocks: [
      {
        text: (
          <>
            The{' '}
            <Link to="/privacy" className={legalLinkClass}>
              privacy policy
            </Link>{' '}
            explains what we collect, who processes it and how to have it
            deleted. It forms part of these terms.
          </>
        ),
      },
    ],
  },
  {
    heading: 'Changes to these terms',
    blocks: [
      {
        text: 'When these terms change we update the date at the top of this page. If a change materially affects your rights, we will tell you by email before it takes effect. Carrying on with Mealy after that means you accept the new terms.',
      },
    ],
  },
  {
    heading: 'Law and disputes',
    blocks: [
      {
        text: 'These terms are governed by the law of the Republic of South Africa, and the South African courts have jurisdiction over any dispute. If you are a consumer somewhere else, this does not take away the protection your local law gives you.',
      },
      {
        text: 'If any part of these terms turns out to be unenforceable, the rest still stands.',
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

function Terms() {
  return (
    <LegalPage
      title="Terms of service"
      updated={UPDATED}
      intro="These are the rules for using Mealy. They are short, and they are written to be read."
      sections={SECTIONS}
    />
  )
}
