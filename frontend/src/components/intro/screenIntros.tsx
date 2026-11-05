// What each main screen's first-visit intro says: per step, a small copy of the screen, its
// title and the two reasons it is worth using; per screen, what the Lucius button asks.
// Assets has its own (assetsIntro.tsx), because its "Set up myself" also runs a tour.
import type { ReactNode } from 'react'
import type { IntlShape } from 'react-intl'
import type { IntroPoint, IntroStep } from './FeatureIntro'
import type { TourStep } from './PageTour'
import {
  AccountsPreview,
  AutomationsPreview,
  BudgetPreview,
  CashFlowPreview,
  CommitmentsPreview,
  ConnectorsPreview,
  DashboardPreview,
  IntelPreview,
  InvestmentsPreview,
  OutlookPreview,
  SkillsPreview,
} from './IntroPreviews'

export type IntroScreen =
  | 'accounts'
  | 'plan'
  | 'plan-cashflow'
  | 'plan-outlook'
  | 'investments'
  | 'intel'
  | 'commitments'
  | 'dashboard'
  | 'automations'
  | 'skills'
  | 'connectors'

export interface ScreenIntroConfig {
  /** What the user calls the screen, for "Walk me through my … screen". */
  name: string
  steps: IntroStep[]
  /** The message the Lucius button opens the chat with. */
  lucius: string
  /** The Lucius button's label, when "Set up with Lucius" doesn't fit (nothing to set up). */
  luciusLabel?: string
  /** The other button's label, when "Set up myself" doesn't fit. */
  secondaryLabel?: string
  /** Where "Set up myself" points on an EMPTY screen: its own way to add the first thing. A
   *  screen with nothing to add has none, and its other button just closes ("Got it"). */
  start?: TourStep
  /** On a screen that already holds data the buttons are "Got it" and "Walk me through it";
   *  a screen with something worth pointing at then names it here instead of "Got it". */
  filled?: { label: string; start: TourStep }
}

// The picture is a small copy of the screen itself, so the title sits under it.
function screen(title: string, hero: ReactNode, points: IntroPoint[]): IntroStep {
  return { title, hero, points }
}

/** Intros the owner turned off because the screen already says what they say (launch review
 *  2026-10-15). The configs stay, so one can come back by leaving this set. */
export const HIDDEN_INTROS: ReadonlySet<IntroScreen> = new Set<IntroScreen>([
  'dashboard',
  'plan-cashflow',
])

export function screenIntros(intl: IntlShape): Record<IntroScreen, ScreenIntroConfig> {
  const { formatMessage } = intl
  return {
    accounts: {
      name: formatMessage({ id: 'firstrun.intro.screen0', defaultMessage: 'Accounts' }),
      start: {
        target: 'setup-accounts',
        title: formatMessage({
          id: 'firstrun.intro.screen1',
          defaultMessage: 'Add your first account',
        }),
        body: formatMessage({
          id: 'firstrun.intro.screen2',
          defaultMessage:
            'A bank account, card, brokerage or loan. Then bring its transactions in.',
        }),
      },
      steps: [
        screen(
          formatMessage({
            id: 'firstrun.intro.screen3',
            defaultMessage: 'Every account, in one ledger',
          }),
          <AccountsPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen4',
                defaultMessage: 'Bring transactions in.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen5',
                defaultMessage:
                  'Import a statement, or let Lucius log them from your bank emails as they arrive.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen6',
                defaultMessage: 'Lucius keeps it tidy.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen7',
                defaultMessage: 'It sorts categories, catches duplicates and flags anything odd.',
              }),
            },
          ],
        ),
      ],
      lucius: formatMessage({
        id: 'firstrun.intro.prompt0',
        defaultMessage:
          'Help me set up my accounts: ask which banks, cards, brokerages and loans I have, add them, then help me bring in their transactions. I can also send you screenshots or statements to read them from. Ask me one thing at a time.',
      }),
    },
    // Plan is three tabs; each introduces itself the first time it is opened, never all three
    // at once over a tab the user can't see yet.
    plan: {
      name: formatMessage({ id: 'firstrun.intro.screen8', defaultMessage: 'Budget' }),
      start: {
        target: 'setup-plan',
        title: formatMessage({
          id: 'firstrun.intro.screen9',
          defaultMessage: 'Pick how you budget',
        }),
        body: formatMessage({
          id: 'firstrun.intro.screen10',
          defaultMessage: 'Choose a method here. You can switch any time.',
        }),
      },
      steps: [
        screen(
          formatMessage({ id: 'firstrun.intro.screen11', defaultMessage: 'Budget your way' }),
          <BudgetPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen12',
                defaultMessage: 'A quick check.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen13',
                defaultMessage:
                  '50/30/20 splits your income into needs, wants and savings. Nothing to maintain.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen14',
                defaultMessage: 'Or zero-based.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen15',
                defaultMessage:
                  'Zero-based assigns each dollar, and you move money when a category runs over.',
              }),
            },
          ],
        ),
      ],
      lucius: formatMessage({
        id: 'firstrun.intro.prompt1',
        defaultMessage:
          'Help me set up my budget: ask a few questions, pick the method that fits me (a quick 50/30/20 check or zero-based), and set it up. Ask me one thing at a time.',
      }),
    },
    'plan-cashflow': {
      name: formatMessage({ id: 'firstrun.intro.screen16', defaultMessage: 'Cash Flow' }),
      steps: [
        screen(
          formatMessage({ id: 'firstrun.intro.screen17', defaultMessage: 'The weeks ahead' }),
          <CashFlowPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen18',
                defaultMessage: 'Cash flow, forward.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen19',
                defaultMessage: 'Your balance day by day, with bills and paydays already on it.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen20',
                defaultMessage: 'No surprises.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen21',
                defaultMessage: 'Spot a low point before it happens, not after.',
              }),
            },
          ],
        ),
      ],
      lucius: formatMessage({
        id: 'firstrun.intro.prompt2',
        defaultMessage:
          'Help me set up my cash flow: ask what I earn each month and when it lands, and my regular bills and when they are due, then show me the weeks ahead. Ask me one thing at a time.',
      }),
    },
    'plan-outlook': {
      name: formatMessage({ id: 'firstrun.intro.screen22', defaultMessage: 'Outlook' }),
      start: {
        target: 'setup-outlook',
        title: formatMessage({ id: 'firstrun.intro.screen23', defaultMessage: 'Try a what-if' }),
        body: formatMessage({
          id: 'firstrun.intro.screen24',
          defaultMessage: 'Drag a lever, or ask Lucius and he moves them for you.',
        }),
      },
      steps: [
        screen(
          formatMessage({ id: 'firstrun.intro.screen25', defaultMessage: 'Will your money last?' }),
          <OutlookPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen26',
                defaultMessage: 'Your outlook.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen27',
                defaultMessage:
                  'See when you could retire, and how likely your plan is to hold up.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen28',
                defaultMessage: 'Try what-ifs.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen29',
                defaultMessage: 'A new job, a child, a downturn: see the effect before it happens.',
              }),
            },
          ],
        ),
      ],
      luciusLabel: formatMessage({
        id: 'firstrun.intro.screen30',
        defaultMessage: 'Try a what-if with Lucius',
      }),
      secondaryLabel: formatMessage({
        id: 'firstrun.intro.screen31',
        defaultMessage: 'Try it myself',
      }),
      lucius: formatMessage({
        id: 'firstrun.intro.prompt3',
        defaultMessage:
          'On my Outlook, walk me through where I stand, then show me what retiring five years earlier would do. Move the sliders so I can see it.',
      }),
    },
    investments: {
      name: formatMessage({ id: 'firstrun.intro.screen32', defaultMessage: 'Investments' }),
      start: {
        target: 'setup-investments',
        title: formatMessage({ id: 'firstrun.intro.screen33', defaultMessage: 'Add a holding' }),
        body: formatMessage({
          id: 'firstrun.intro.screen34',
          defaultMessage: 'A stock, fund or coin, with how many you hold and where.',
        }),
      },
      steps: [
        screen(
          formatMessage({
            id: 'firstrun.intro.screen35',
            defaultMessage: 'All your investments, one view',
          }),
          <InvestmentsPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen36',
                defaultMessage: 'Every broker together.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen37',
                defaultMessage: 'Holdings, returns, dividends and options in one place.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen38',
                defaultMessage: 'Lucius watches your mix.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen39',
                defaultMessage: 'It flags concentration and drift before they cost you.',
              }),
            },
          ],
        ),
      ],
      lucius: formatMessage({
        id: 'firstrun.intro.prompt4',
        defaultMessage:
          'Help me add my investments: ask which brokers and holdings I have, add them, then tell me what stands out about my mix. If it is easier, I can send you a screenshot or statement instead of typing. Ask me one thing at a time.',
      }),
    },
    intel: {
      name: formatMessage({ id: 'firstrun.intro.screen40', defaultMessage: 'Intel' }),
      start: {
        target: 'setup-intel',
        title: formatMessage({ id: 'firstrun.intro.screen41', defaultMessage: 'Watch a ticker' }),
        body: formatMessage({
          id: 'firstrun.intro.screen42',
          defaultMessage: 'Add something to watch. Lucius tells you when it moves.',
        }),
      },
      steps: [
        screen(
          formatMessage({
            id: 'firstrun.intro.screen43',
            defaultMessage: 'Know when something moves your money',
          }),
          <IntelPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen44',
                defaultMessage: 'Watch what matters.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen45',
                defaultMessage: 'Tickers and topics, with alerts that tell Lucius what to do.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen46',
                defaultMessage: 'Signals, not noise.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen47',
                defaultMessage: 'Only the news that touches what you hold.',
              }),
            },
          ],
        ),
      ],
      lucius: formatMessage({
        id: 'firstrun.intro.prompt5',
        defaultMessage:
          'Help me set up Intel: ask what I hold or want to follow, suggest what to watch, and set alerts that tell you what to do when they fire. Ask me one thing at a time.',
      }),
    },
    commitments: {
      name: formatMessage({ id: 'firstrun.intro.screen48', defaultMessage: 'Commitments' }),
      start: {
        target: 'setup-commitments',
        title: formatMessage({ id: 'firstrun.intro.screen49', defaultMessage: 'Add a big date' }),
        body: formatMessage({
          id: 'firstrun.intro.screen50',
          defaultMessage: 'A purchase, a loan or a goal, with its date and amount.',
        }),
      },
      steps: [
        screen(
          formatMessage({
            id: 'firstrun.intro.screen51',
            defaultMessage: 'Big dates, funded on time',
          }),
          <CommitmentsPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen52',
                defaultMessage: 'Plan the big ones.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen53',
                defaultMessage: 'A car, a wedding, a loan, each with its date and amount.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen54',
                defaultMessage: 'Know how you will pay.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen55',
                defaultMessage: 'See where the money comes from, month by month.',
              }),
            },
          ],
        ),
      ],
      lucius: formatMessage({
        id: 'firstrun.intro.prompt6',
        defaultMessage:
          'Help me plan my commitments: ask about big expenses, loans or goals coming up, add each with its date and amount, and show me how I will fund them. I can also send you a contract or payment schedule to read. Ask me one thing at a time.',
      }),
    },
    dashboard: {
      name: formatMessage({ id: 'firstrun.intro.screen56', defaultMessage: 'Dashboard' }),
      // Empty, there is nothing to arrange yet: Lucius sets up the accounts that fill it.
      filled: {
        label: formatMessage({ id: 'firstrun.intro.screen57', defaultMessage: 'Customize it' }),
        start: {
          target: 'setup-dashboard',
          title: formatMessage({ id: 'firstrun.intro.screen58', defaultMessage: 'Make it yours' }),
          body: formatMessage({
            id: 'firstrun.intro.screen59',
            defaultMessage: 'Add, remove and arrange widgets here.',
          }),
        },
      },
      steps: [
        screen(
          formatMessage({
            id: 'firstrun.intro.screen60',
            defaultMessage: 'Your money at a glance',
          }),
          <DashboardPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen61',
                defaultMessage: 'Pick what you see.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen62',
                defaultMessage: 'Net worth, cash flow and spending, as widgets you arrange.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen63',
                defaultMessage: 'Ask about any number.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen64',
                defaultMessage: 'Lucius explains what changed and why.',
              }),
            },
          ],
        ),
      ],
      lucius: formatMessage({
        id: 'firstrun.intro.prompt7',
        defaultMessage:
          'My dashboard is empty. Help me get started: walk me through adding my accounts so it fills in. Ask me one thing at a time.',
      }),
    },
    automations: {
      name: formatMessage({ id: 'firstrun.intro.screen65', defaultMessage: 'Automations' }),
      // Its add button leads the header; pointing at it would only state the obvious.
      secondaryLabel: formatMessage({
        id: 'firstrun.intro.screen66',
        defaultMessage: 'Set up myself',
      }),
      steps: [
        screen(
          formatMessage({
            id: 'firstrun.intro.screen67',
            defaultMessage: 'Lucius works while you are away',
          }),
          <AutomationsPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen68',
                defaultMessage: 'On a schedule or a trigger.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen69',
                defaultMessage: 'Every month, when a price hits, or when a bill email lands.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen70',
                defaultMessage: 'You stay in control.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen71',
                defaultMessage:
                  'Choose what needs your OK first. Every run is a conversation you can reopen.',
              }),
            },
          ],
        ),
      ],
      lucius: formatMessage({
        id: 'firstrun.intro.prompt8',
        defaultMessage:
          'Help me set up my first automation: ask what I want done on a schedule or when something happens, then create it. Ask me one thing at a time.',
      }),
    },
    skills: {
      name: formatMessage({ id: 'firstrun.intro.screen72', defaultMessage: 'Skills' }),
      // Its add button leads the header; pointing at it would only state the obvious.
      steps: [
        screen(
          formatMessage({
            id: 'firstrun.intro.screen73',
            defaultMessage: 'Teach Lucius how you do things',
          }),
          <SkillsPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen74',
                defaultMessage: 'Your way, every time.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen75',
                defaultMessage: 'A skill is a playbook Lucius follows step by step.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen76',
                defaultMessage: 'Type / to run one.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen77',
                defaultMessage: 'Or ask Lucius to save what he just did as a skill.',
              }),
            },
          ],
        ),
      ],
      luciusLabel: formatMessage({
        id: 'firstrun.intro.screen78',
        defaultMessage: 'Make one with Lucius',
      }),
      secondaryLabel: formatMessage({
        id: 'firstrun.intro.screen79',
        defaultMessage: 'Write one myself',
      }),
      lucius: formatMessage({
        id: 'firstrun.intro.prompt9',
        defaultMessage:
          'Help me make my first skill: ask what I do often that you should do my way, then write it as a skill. Ask me one thing at a time.',
      }),
    },
    connectors: {
      name: formatMessage({ id: 'firstrun.intro.screen80', defaultMessage: 'Connectors' }),
      // Its add button leads the header; pointing at it would only state the obvious.
      secondaryLabel: formatMessage({
        id: 'firstrun.intro.screen66',
        defaultMessage: 'Set up myself',
      }),
      steps: [
        screen(
          formatMessage({
            id: 'firstrun.intro.screen81',
            defaultMessage: 'Extend what Lucius can do',
          }),
          <ConnectorsPreview />,
          [
            {
              title: formatMessage({
                id: 'firstrun.intro.screen82',
                defaultMessage: 'Data, channels and tools.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen83',
                defaultMessage: 'Bank feeds, Telegram, web search, or any MCP server.',
              }),
            },
            {
              title: formatMessage({
                id: 'firstrun.intro.screen84',
                defaultMessage: 'You decide what he may use.',
              }),
              body: formatMessage({
                id: 'firstrun.intro.screen85',
                defaultMessage: 'Each connector has its own permissions.',
              }),
            },
          ],
        ),
      ],
      lucius: formatMessage({
        id: 'firstrun.intro.prompt10',
        defaultMessage:
          'Help me choose connectors: ask what I want you to be able to do, like pull my bank transactions, message me on Telegram or search the web, then set up the ones that fit. Ask me one thing at a time.',
      }),
    },
  }
}
