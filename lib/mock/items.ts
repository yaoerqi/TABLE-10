export type ItemCategory = "Textbooks" | "Electronics" | "Skill Swap";

export interface MockItem {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  sellerAvatar: string;
  meetupLocation: string;
  category: ItemCategory;
}

export const mockItems: MockItem[] = [
  {
    id: "1",
    title: "Data Structures Textbook (8th Ed.)",
    price: 68,
    imageUrl:
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=12",
    meetupLocation: "Dorm Building 5",
    category: "Textbooks"
  },
  {
    id: "2",
    title: "iPad 9th Gen with Pencil",
    price: 1800,
    imageUrl:
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=22",
    meetupLocation: "Library Gate",
    category: "Electronics"
  },
  {
    id: "3",
    title: "Poster Design Help (2h Session)",
    price: 120,
    imageUrl:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=9",
    meetupLocation: "Innovation Hub",
    category: "Skill Swap"
  },
  {
    id: "4",
    title: "Wireless Keyboard + Mouse Combo",
    price: 150,
    imageUrl:
      "https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=16",
    meetupLocation: "Dorm Building 2",
    category: "Electronics"
  },
  {
    id: "5",
    title: "Probability Notes + Exam Cheatsheet",
    price: 30,
    imageUrl:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=27",
    meetupLocation: "Teaching Building A",
    category: "Textbooks"
  },
  {
    id: "6",
    title: "Photography Walk + Editing Tips",
    price: 90,
    imageUrl:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    sellerAvatar: "https://i.pravatar.cc/100?img=35",
    meetupLocation: "Campus Lake",
    category: "Skill Swap"
  }
];
