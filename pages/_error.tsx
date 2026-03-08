import * as Sentry from '@sentry/nextjs'
import NextErrorComponent, { type ErrorProps } from 'next/error'
import type { NextPageContext } from 'next'

type ErrorComponentProps = ErrorProps & {
  hasGetInitialPropsRun?: boolean
  err?: Error
}

const CustomErrorComponent = (props: ErrorComponentProps) => <NextErrorComponent statusCode={props.statusCode} />

CustomErrorComponent.getInitialProps = async (contextData: NextPageContext) => {
  const errorInitialProps = await NextErrorComponent.getInitialProps(contextData)
  await Sentry.captureUnderscoreErrorException(contextData)
  return errorInitialProps
}

export default CustomErrorComponent
