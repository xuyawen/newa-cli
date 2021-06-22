module.exports = dir => [
  {
      name: 'action',
      type: 'list',
      message: `Target directory ${dir} already exists. Pick an action:`,
      choices: [
          { name: 'Overwrite', value: 'overwrite' },
          { name: 'Merge', value: 'merge' },
      ],
  },
];