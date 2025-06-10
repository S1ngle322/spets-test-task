import { Model, DataTypes, Sequelize } from 'sequelize'

class UserModel extends Model {
  public id!: number;
  public balance!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initModel(sequelize: Sequelize) {
    UserModel.init(
      {
        balance: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
      },
      {
        sequelize,
        modelName: 'UserModel',
        tableName: 'Users',
      }
    )
    return UserModel
  }
}

export default UserModel
