declare module "web-push" {
  type WebPushOptions = {
    TTL?: number;
  };

  type PushSubscriptionLike = {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  type WebPushModule = {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(
      subscription: PushSubscriptionLike,
      payload: string,
      options?: WebPushOptions,
    ): Promise<void>;
  };

  const webpush: WebPushModule;
  export default webpush;
}
