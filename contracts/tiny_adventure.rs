use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::solana_program::system_instruction;

declare_id!("8qfd4NkZW8fPQE4uaqLB1xoFh2fcVU7ShTKbRqmrqZ1G");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct QuestPosition {
    x: u8,
    y: u8,
}

#[program]
mod tiny_adventure {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let game = &mut ctx.accounts.game_account;
        game.x = 0;
        game.y = 0;
        game.quests_reached = 0;
        game.moves_taken = 0;

        let clock = Clock::get()?.unix_timestamp;
        let quest_positions = generate_random_positions(clock, 3); // 3 quests

        let quest = &mut ctx.accounts.quest_account;
        quest.positions = quest_positions.clone(); // Clone for current positions
        quest.original_positions = quest_positions;
        msg!("Game Initialized with quests at {:?}", quest.positions);
        let treasure = &mut ctx.accounts.treasure_account;
        treasure.owner = ctx.accounts.signer.key(); // Assign signer as owner
        treasure.balance = 0;
        Ok(())
    }

    pub fn move_player(ctx: Context<Move>, direction: u8) -> Result<()> {
        let game = &mut ctx.accounts.game_account;
        let quest = &mut ctx.accounts.quest_account;
        game.moves_taken += 1;

        match direction {
            0 if game.y > 0 => game.y -= 1, // Up
            1 if game.y < 9 => game.y += 1, // Down
            2 if game.x > 0 => game.x -= 1, // Left
            3 if game.x < 9 => game.x += 1, // Right
            _ => return Err(error!(MyError::InvalidMove)),
        }

        // Check if quest reached
        if quest
            .positions
            .iter()
            .any(|p| p.x == game.x && p.y == game.y)
        {
            game.quests_reached += 1;
            quest.positions.retain(|p| p.x != game.x || p.y != game.y);
            msg!("Quest collected at ({}, {})", game.x, game.y);
        }
        // Check if reached goal
        if game.x == 9 && game.y == 9 {
            distribute_reward(
                ctx.accounts.treasure_account.to_account_info(),
                ctx.accounts.signer.to_account_info(),
                game,
                quest,
            )?;
            reset_game(
                &mut ctx.accounts.game_account,
                &mut ctx.accounts.quest_account,
            )?;
            msg!("Game Reset Automatically");
        }
        Ok(())
    }
    pub fn reset(ctx: Context<Reset>) -> Result<()> {
        reset_game(
            &mut ctx.accounts.game_account,
            &mut ctx.accounts.quest_account,
        )?;
        msg!("Game Reset Manually");
        Ok(())
    }

    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        let owner = &ctx.accounts.owner;
        let treasure = &ctx.accounts.treasure_account;
        require!(owner.key() == treasure.owner, MyError::Unauthorized);
        let ix =
            system_instruction::transfer(&owner.key(), &treasure.to_account_info().key(), amount);
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[owner.to_account_info(), treasure.to_account_info()],
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init_if_needed, payer = signer, space = 8 + 16, seeds=[b"tiny_adventurev2", signer.key().as_ref()], bump)]
    pub game_account: Account<'info, Game>,
    #[account(init_if_needed, payer = signer, space = 8 + 24 + (3 * 2) * 2, seeds=[b"questv2", signer.key().as_ref()], bump)]
    pub quest_account: Account<'info, Quest>,
    #[account(init_if_needed, payer = signer, space = 8 + 32+8, seeds=[b"treasurev2"], bump)]
    pub treasure_account: Account<'info, Treasure>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Move<'info> {
    #[account(mut, seeds=[b"tiny_adventurev2", signer.key().as_ref()], bump)]
    pub game_account: Account<'info, Game>,
    #[account(mut, seeds=[b"questv2", signer.key().as_ref()], bump)]
    pub quest_account: Account<'info, Quest>,
    #[account(mut, seeds=[b"treasurev2"], bump)]
    pub treasure_account: Account<'info, Treasure>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct Reset<'info> {
    #[account(mut, seeds=[b"tiny_adventurev2", signer.key().as_ref()], bump)]
    pub game_account: Account<'info, Game>,
    #[account(mut, seeds=[b"questv2", signer.key().as_ref()], bump)]
    pub quest_account: Account<'info, Quest>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds=[b"treasurev2"], bump)]
    pub treasure_account: Account<'info, Treasure>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Game {
    x: u8,
    y: u8,
    quests_reached: u8,
    moves_taken: u16,
}

#[account]
pub struct Quest {
    positions: Vec<QuestPosition>,
    original_positions: Vec<QuestPosition>,
}

#[account]
pub struct Treasure {
    owner: Pubkey,
    balance: u64,
}

#[error_code]
pub enum MyError {
    #[msg("Invalid Move")]
    InvalidMove,
    #[msg("Unauthorized Action")]
    Unauthorized,
    #[msg("Insufficient Balance in Treasure Account")]
    InsufficientBalance,
}
fn reset_game(game: &mut Account<Game>, quest: &mut Account<Quest>) -> Result<()> {
    game.x = 0;
    game.y = 0;
    game.quests_reached = 0;
    game.moves_taken = 0;

    let clock = Clock::get()?.unix_timestamp;
    let quest_positions = generate_random_positions(clock, 3);
    quest.positions = quest_positions.clone(); // Clone for current positions
    quest.original_positions = quest_positions;
    msg!("Game Reset with new quests: {:?}", quest.positions);

    Ok(())
}

fn generate_random_positions(seed: i64, count: usize) -> Vec<QuestPosition> {
    let mut positions = vec![];
    let mut seed_val = seed;
    for _ in 0..count {
        let x = (seed_val % 10) as u8;
        let y = ((seed_val / 10) % 10) as u8;
        if x != 0 || y != 0 {
            positions.push(QuestPosition { x, y });
        }
        seed_val /= 100;
    }
    positions
}

fn distribute_reward(
    treasure: AccountInfo,
    user: AccountInfo,
    game: &Game,
    quest: &Quest,
) -> Result<()> {
    let quest_positions: Vec<(u8, u8)> = quest
        .original_positions
        .iter()
        .map(|p| (p.x, p.y))
        .collect();
    let optimal_moves = compute_optimal_moves(&quest_positions);
    let reward = calculate_reward(
        game.moves_taken,
        optimal_moves,
        game.quests_reached,
        quest.original_positions.len(),
    );

    let mut treasure_lamports = treasure.try_borrow_mut_lamports()?;
    let mut user_lamports = user.try_borrow_mut_lamports()?;

    msg!("Treasure balance: {}", **treasure_lamports);
    msg!("Calculated reward: {}", reward);

    if **treasure_lamports < reward {
        return Err(error!(MyError::InsufficientBalance));
    }

    **treasure_lamports -= reward;
    **user_lamports += reward;
    msg!("Player rewarded {} lamports", reward);
    Ok(())
}

fn compute_optimal_moves(quests: &Vec<(u8, u8)>) -> u16 {
    let mut waypoints = vec![(0, 0)];
    waypoints.extend_from_slice(quests);
    waypoints.push((9, 9));
    waypoints.sort();
    let mut total_distance = 0;
    for i in 0..waypoints.len() - 1 {
        total_distance += (waypoints[i].0 as i16 - waypoints[i + 1].0 as i16).abs()
            + (waypoints[i].1 as i16 - waypoints[i + 1].1 as i16).abs();
    }
    total_distance as u16
}

fn calculate_reward(
    user_moves: u16,
    optimal_moves: u16,
    quests_reached: u8,
    total_quests: usize,
) -> u64 {
    let efficiency = optimal_moves as f64 / user_moves as f64;
    let quest_factor = quests_reached as f64 / total_quests as f64;
    let reward_score = (quest_factor * 0.7 + efficiency * 0.3).min(1.0);

    (1_000_000_000.0 * reward_score) as u64
}
