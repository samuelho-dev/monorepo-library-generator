/**
 * User Events Index
 *
 * @module @samuelho-dev/feature-user/server/events
 */

export {
  UserEventPublisher,
  UserEventTopics,
  createUserEventSubscription,
} from "./publisher"

export type { UserEventPublisherInterface } from "./publisher"
