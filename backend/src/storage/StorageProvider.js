export class StorageProvider {
  async save(_streamOrTempPath, _key) { throw new Error('save must be implemented'); }
  openReadStream(_key) { throw new Error('openReadStream must be implemented'); }
  async delete(_key) { throw new Error('delete must be implemented'); }
  async deletePrefix(_prefix) { throw new Error('deletePrefix must be implemented'); }
  async exists(_key) { throw new Error('exists must be implemented'); }
}
