import { env } from '@/env.mjs'
import { MUX_WEBHOOK_EVENT } from '@/inngest/events/mux-webhook'
import { VideoResourceSchema } from '@/inngest/functions/transcript-ready'
import { inngest } from '@/inngest/inngest.server'
import { sanityMutation, sanityQuery } from '@/server/sanity.server'

export const muxVideoAssetCreated = inngest.createFunction(
  { id: `mux-video-asset-created`, name: 'Mux Video Asset Created' },
  {
    event: MUX_WEBHOOK_EVENT,
    if: 'event.data.muxWebhookEvent.type == "video.asset.created"',
  },
  async ({ event, step }) => {
    await step.run('announce asset created', async () => {
      await fetch(`${env.NEXT_PUBLIC_PARTY_KIT_URL}/party/${env.NEXT_PUBLIC_PARTYKIT_ROOM_NAME}`, {
        method: 'POST',
        body: JSON.stringify({
          body: `Mux Asset created: ${event.data.muxWebhookEvent.data.id}`,
          requestId: event.data.muxWebhookEvent.data.passthrough,
        }),
      }).catch((e) => {
        console.error(e)
      })
    })
    return event.data.muxWebhookEvent.data
  },
)

export const muxVideoAssetReady = inngest.createFunction(
  { id: `mux-video-asset-ready`, name: 'Mux Video Asset Ready' },
  {
    event: MUX_WEBHOOK_EVENT,
    if: 'event.data.muxWebhookEvent.type == "video.asset.ready"',
  },
  async ({ event, step }) => {
    const videoResource = await step.run('Load Video Resource', async () => {
      const resourceTemp = VideoResourceSchema.safeParse(
        await sanityQuery(`*[_type == "videoResource" && muxAssetId == "${event.data.muxWebhookEvent.data.id}"][0]`),
      )
      return resourceTemp.success ? resourceTemp.data : null
    })

    if (videoResource) {
      await step.run('update the video resource in Sanity', async () => {
        return await sanityMutation([
          {
            patch: {
              id: videoResource._id,
              set: {
                duration: event.data.muxWebhookEvent.data.duration,
              },
            },
          },
        ])
      })
    }

    await step.run('announce asset ready', async () => {
      await fetch(`${env.NEXT_PUBLIC_PARTY_KIT_URL}/party/${env.NEXT_PUBLIC_PARTYKIT_ROOM_NAME}`, {
        method: 'POST',
        body: JSON.stringify({
          body: videoResource?.muxPlaybackId,
          requestId: event.data.muxWebhookEvent.data.passthrough,
          name: 'video.asset.ready',
        }),
      }).catch((e) => {
        console.error(e)
      })
    })
    return event.data.muxWebhookEvent.data
  },
)
