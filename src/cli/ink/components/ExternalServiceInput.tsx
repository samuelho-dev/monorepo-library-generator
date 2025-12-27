/**
 * External Service Input Component
 *
 * Text input for entering the external service name (for provider libraries).
 * Uses centralized validation from config layer.
 *
 * @module monorepo-library-generator/cli/ink/components/ExternalServiceInput
 */

import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useState } from 'react'
import { useOperations } from '../bridge/operations-context'
import { colors } from '../theme/colors'

interface ExternalServiceInputProps {
  readonly onSubmit: (service: string) => void
}

export function ExternalServiceInput({ onSubmit }: ExternalServiceInputProps) {
  const { validation } = useOperations()
  const [service, setService] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleChange = (value: string) => {
    setService(value)
    setError(null)
  }

  useInput((input, key) => {
    if (key.return) {
      const result = validation.validateExternalService(service)
      if (!result.isValid) {
        setError(result.error)
      } else {
        onSubmit(service.trim())
      }
    }
  })

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Enter external service name:</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={colors.muted}>e.g., stripe, twilio, sendgrid, aws-s3</Text>
      </Box>
      <Box>
        <Text color={colors.primary}>&gt; </Text>
        <TextInput value={service} onChange={handleChange} placeholder="stripe" />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={colors.error}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={colors.muted}>Press Enter to continue</Text>
      </Box>
    </Box>
  )
}
