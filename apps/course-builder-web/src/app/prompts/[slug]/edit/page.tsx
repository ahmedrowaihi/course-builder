import * as React from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { EditPromptForm } from '@/app/prompts/_components/edit-prompt-form'
import { getPrompt } from '@/lib/prompts-query'
import { getServerAuthSession } from '@/server/auth'

export const dynamic = 'force-dynamic'

export default async function PromptEditPage({
	params,
}: {
	params: { slug: string }
}) {
	headers()
	const { ability } = await getServerAuthSession()
	const prompt = await getPrompt(params.slug)

	if (!prompt || !ability.can('create', 'Content')) {
		notFound()
	}

	return <EditPromptForm key={prompt.slug} prompt={prompt} />
}
