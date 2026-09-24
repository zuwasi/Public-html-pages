namespace QPECost

/-- Number of controlled-U applications in the repeated-powers QPE schedule. -/
def cost : Nat → Nat
  | 0 => 0
  | m + 1 => cost m + 2 ^ m

theorem cost_add_one (m : Nat) : cost m + 1 = 2 ^ m := by
  induction m with
  | zero => rfl
  | succ m ih =>
      calc
        cost (m + 1) + 1 = (cost m + 1) + 2 ^ m := by
          simp only [cost]
          ac_rfl
        _ = 2 ^ m + 2 ^ m := by rw [ih]
        _ = 2 ^ (m + 1) := by simp [Nat.pow_succ, Nat.mul_two]

theorem cost_eq (m : Nat) : cost m = 2 ^ m - 1 := by
  exact Nat.eq_sub_of_add_eq (cost_add_one m)

end QPECost
