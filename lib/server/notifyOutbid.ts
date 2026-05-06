/**
 * Placeholder: notify a user that they were outbid on an auction item.
 * Wire to push / email / in-app inbox when those exist.
 */
export async function notifyUserOutbid(params: {
  outbidUserId: string;
  itemId: string;
  itemTitle: string;
  newHighAmount: number;
}): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.info("[notifyUserOutbid]", params);
  }
  void params.outbidUserId;
  void params.itemId;
  void params.itemTitle;
  void params.newHighAmount;
}
