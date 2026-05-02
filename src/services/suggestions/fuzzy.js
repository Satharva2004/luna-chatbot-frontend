import Fuse from 'fuse.js';
import data from './data.json';

export const general_chatbot_questions = data

const fuse = new Fuse(data.map(q => ({ $: q })), {
  includeScore: true,
  threshold: 0.8,
  minMatchCharLength: 2,
  keys: ['$']
});

// Fuzzy search configuration
export const fuzzySearch = (query) => {
  return fuse.search(query).map(result => result.item.$);
};
