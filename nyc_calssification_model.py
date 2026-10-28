import numpy as np 
import pandas as pd 
import matplotlib.pyplot as plt 
import seaborn as sns 
import kagglehub 
import os
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder, PowerTransformer
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.model_selection import RandomizedSearchCV


path = kagglehub.dataset_download("dgomonov/new-york-city-airbnb-open-data")
print(path)

df = pd.read_csv(os.path.join(path, "AB_NYC_2019.csv"))
print(df.head())
print(df.info())
print(df.describe())
print(df.describe(include='all'))

#EDA
#step 1 missing values
missing = df.isnull().sum()
print(missing[missing > 0])

# step 2 target variable
print(df['room_type'].unique())
print(df['room_type'].value_counts())
sns.countplot(x='room_type',data=df)
plt.title('room_type_unique_value')
plt.show() # class imbalance hai shared room is small in number 

#step 3 univariate analysis numeric features
numerical_cols = ["price", "minimum_nights", "number_of_reviews",
                 "reviews_per_month", "calculated_host_listings_count",
                 "availability_365"]

df[numerical_cols].hist(figsize=(12, 10))
plt.show()

sns.countplot(data=df, x = 'neighbourhood_group')
plt.show()

#step 4 bivariate analysis (feature vs target)
sns.boxplot(x='room_type',y='price',data=df)
plt.show()

# step-5 correlation between numeric features
corr = df[numerical_cols + ['latitude', 'longitude']].corr()
plt.figure(figsize=(12,10))
sns.heatmap(corr, annot=True, cmap='coolwarm')
plt.show()

# step 6 Geographic Distribution (Bonus Visual)
sns.scatterplot(x='longitude', y='latitude',data=df, hue='room_type', alpha=0.4, s=10)
plt.title('Geographic Distribution')
plt.show()

# data cleaning and feature engineering
# 1. drop the columns that does not have effect on the target variable or the model
df_clean = df.drop(columns=['id', 'name', 'host_name', 'last_review','host_id'])

# 2. no reviews yet -> 0 reviews per month, not missing
df_clean['reviews_per_month'] = df_clean['reviews_per_month'].fillna(0)

#3. cap extreme outliers instead deleting rows.
price_cap = df_clean['price'].quantile(0.99)
nights_cap = df_clean['minimum_nights'].quantile(0.99)

df_clean['price'] = df_clean['price'].clip(upper=price_cap)
df_clean['minimum_nights'] = df_clean['minimum_nights'].clip(upper=nights_cap)

#separate features
X = df_clean.drop(columns=['room_type'])
y = df_clean['room_type']

#train test split
# We hold out 20% of the data as a test set that is never touched during model selection or tuning — it is only used once, at the very end, to report the final, honest performance. stratify=y keeps the same class proportions in both splits, which matters because the target is imbalanced.
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.33, random_state=42, stratify=y)
# we must stratify data in classification problem cause there is class imbalance data and so that when we split the data in training and testing it is splited in proper split like 80 no and 20 yes in train then 80 no and 20 yes in test as well 

# preprocessing :- Colummn transformer + pipeline 
numerical_cols = ["latitude","longitude","price", "minimum_nights", "number_of_reviews",
                 "reviews_per_month", "calculated_host_listings_count",
                 "availability_365"]

categorical_cols = ['neighbourhood_group', 'neighbourhood']

print(df_clean[numerical_cols].skew())

# 1.pipeline for numeric Pipeline 
numeric_pipeline = Pipeline(steps=[
    ('impute',SimpleImputer(strategy="median")),
    ("scale",StandardScaler())
])

# 2.pipeline for categorical Pipeline
categorical_pipeline = Pipeline(steps=[
    ('impute',SimpleImputer(strategy="most_frequent")),
    ('encode',OneHotEncoder(handle_unknown='ignore'))
])

# 3. columntransformer 
preprocessor = ColumnTransformer(transformers=[
    ("numerical", numeric_pipeline, numerical_cols),
    ("categorical", categorical_pipeline, categorical_cols)
])


# as we have seen there is class imbalance in the target variable because shared is very less in number 
# to resolve class imbalance there are diff methods 
# 1 is SMOTE :- Synthetic Minority Oversampling Technique used to increase the number of minority class samples by creating synthetic samples 
# disadvantages of SMOTE 
# High chances of Overfitting.
# Data Leakage

#class weight is the second option
# class_weight="Balanced" tells the model to pay more attention to the minority class
# or rare class (Shared Room)
# but the problem is GradintBossting doesnt support class weight so we left it as it is.
models = {
    "Logistic Regression": LogisticRegression(class_weight='balanced',random_state=42),
    "Decision Tree": DecisionTreeClassifier(class_weight='balanced',random_state=42),
    "Random Forest": RandomForestClassifier(class_weight='balanced',random_state=42),
    "Gradient Boosting": GradientBoostingClassifier(random_state=42)
}

for name,model in models.items():
    pipe = Pipeline(steps=[
        ("preprocessor",preprocessor),
        ("classifier",model)
    ])

    #accuracy alone can be misleading for imbalance class so we use macro f1 score
    # macro f1 score is the average of f1 score of all classes 
    accuracy = cross_val_score(pipe, X_train,y_train,cv=3,scoring="accuracy")
    macro_f1 = cross_val_score(pipe, X_train,y_train,cv=3,scoring="f1_macro")

    print(f"{name} -> Accuracy: {accuracy.mean():.3f} , F1: {macro_f1.mean():.3f}")
    
#hyperparameter tuning 
best_pipeline = Pipeline(steps=[
    ("preprocessor",preprocessor),
    ("classifier",RandomForestClassifier(class_weight='balanced',random_state=42))
])

param_distribution = {
    "classifier__n_estimators":[100,200,300,150],
    "classifier__max_depth": [8, 12, 15, 20, None],
    "classifier__min_samples_split": [2, 5, 10],
}

random_search = RandomizedSearchCV(
    estimator=best_pipeline,
    param_distributions=param_distribution,
    n_iter=10, 
    scoring="f1_macro", 
    cv=3, 
    random_state=42, 
)

random_search.fit(X_train, y_train)

print("best parameter:",random_search.best_params_)
print("best score:",random_search.best_score_)

from sklearn.metrics import accuracy_score, confusion_matrix,f1_score
best_pipeline = random_search.best_estimator_

y_pred = best_pipeline.predict(X_test)

print(f"Accuracy Score: {accuracy_score(y_test, y_pred)}")
print(f"F1 Score: {f1_score(y_test, y_pred, average = 'macro')}")
sns.heatmap(confusion_matrix(y_test,y_pred), annot=True, fmt=".2f",
            xticklabels=best_pipeline.classes_, yticklabels=best_pipeline.classes_)
plt.title('Confusion Matrix')
plt.xlabel('Predicted')
plt.ylabel('Truth')
plt.show()

import joblib

joblib.dump(best_pipeline, "Model_Pipeline.pkl",compress=3)
