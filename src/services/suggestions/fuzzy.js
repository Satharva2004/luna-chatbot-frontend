import Fuse from 'fuse.js';
import data from './data.json';

export const general_chatbot_questions = data

// Fuzzy search configuration
export const fuzzySearch = (query) => {
  const options = {
    includeScore: true,
    threshold: 0.8,
    minMatchCharLength: 2,
    keys: ['$']
  };
  
  const fuse = new Fuse(data.map(q => ({ $: q })), options);
  return fuse.search(query).map(result => result.item.$);
};
