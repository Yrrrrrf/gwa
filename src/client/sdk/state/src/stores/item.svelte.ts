import { type Item } from "@sdk/core";

export function createItemStore() {
  let items = $state<Item[]>([]);
  let selectedItem = $state<Item | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  return {
    get all() {
      return items;
    },
    get selected() {
      return selectedItem;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    setItems(newItems: Item[]) {
      items = newItems;
    },
    selectItem(item: Item | null) {
      selectedItem = item;
    },
    setLoading(isLoading: boolean) {
      loading = isLoading;
    },
    setError(err: string | null) {
      error = err;
    },
  };
}

export const itemStore = createItemStore();
