const APIFeatures = class {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    let queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((field) => delete queryObj[field]);

    queryObj = JSON.stringify(queryObj);
    queryObj = JSON.parse(
      queryObj.replace(/\b(gte|lte|gt|lt)\b/g, (matchedEls) => `$${matchedEls}`)
    );

    this.query = this.query.find(queryObj);
    return this;
  }

  sort() {
    let sortBy;
    if (this.queryString.sort) {
      sortBy = this.queryString.sort.replace(/,/g, ' ');
    } else {
      sortBy = '-createdAt';
    }

    this.query = this.query.sort(sortBy);
    return this;
  }

  fields() {
    let fields;
    if (this.queryString.fields) {
      fields = this.queryString.fields.replace(/,/g, ' ');
    } else {
      fields = '-__v';
    }
    this.query = this.query.select(fields);
    return this;
  }

  pagination() {
    const page = +this.queryString?.page ?? 1;
    const limit = +this.queryString?.limit ?? 10;
    const skipped = (page - 1) * limit;

    this.query = this.query.skip(skipped).limit(limit);
    return this;
  }
};

module.exports = APIFeatures;
